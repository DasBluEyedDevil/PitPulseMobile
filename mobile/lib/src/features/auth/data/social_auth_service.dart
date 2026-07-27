import 'dart:async';

import 'package:google_sign_in/google_sign_in.dart';
import 'package:sign_in_with_apple/sign_in_with_apple.dart';

import '../../../core/api/dio_client.dart';
import '../domain/user.dart';

/// Result of social authentication
class SocialAuthResult {
  final User user;
  final String token;
  final String refreshToken;
  final bool isNewUser;

  SocialAuthResult({
    required this.user,
    required this.token,
    required this.refreshToken,
    required this.isNewUser,
  });

  factory SocialAuthResult.fromJson(Map<String, dynamic> json) {
    return SocialAuthResult(
      user: User.fromJson(json['user'] as Map<String, dynamic>),
      token: json['token'] as String,
      refreshToken: json['refreshToken'] as String,
      isNewUser: json['isNewUser'] as bool? ?? false,
    );
  }
}

class AppleSocialCredential {
  const AppleSocialCredential({
    required this.identityToken,
    this.givenName,
    this.familyName,
  });

  final String identityToken;
  final String? givenName;
  final String? familyName;
}

/// Low-level platform boundary for the Google and Apple SDKs.
abstract interface class SocialAuthPlatform {
  Future<String?> signInWithGoogle();
  Future<AppleSocialCredential> signInWithApple();
  Future<void> signOutGoogle();
}

class DefaultSocialAuthPlatform implements SocialAuthPlatform {
  final GoogleSignIn _googleSignIn = GoogleSignIn.instance;
  Completer<void>? _initCompleter;

  Future<void> _ensureGoogleSignInInitialized() async {
    if (_initCompleter != null) {
      return _initCompleter!.future;
    }
    _initCompleter = Completer<void>();
    try {
      await _googleSignIn.initialize();
      _initCompleter!.complete();
    } catch (_) {
      _initCompleter = null;
      rethrow;
    }
  }

  @override
  Future<String?> signInWithGoogle() async {
    await _ensureGoogleSignInInitialized();
    var account = await _googleSignIn.attemptLightweightAuthentication();
    if (account == null && _googleSignIn.supportsAuthenticate()) {
      account = await _googleSignIn.authenticate();
    }
    if (account == null) return null;

    final idToken = account.authentication.idToken;
    if (idToken == null || idToken.isEmpty) {
      throw Exception('Failed to get Google ID token');
    }
    return idToken;
  }

  @override
  Future<AppleSocialCredential> signInWithApple() async {
    final credential = await SignInWithApple.getAppleIDCredential(
      scopes: [
        AppleIDAuthorizationScopes.email,
        AppleIDAuthorizationScopes.fullName,
      ],
    );
    final identityToken = credential.identityToken;
    if (identityToken == null || identityToken.isEmpty) {
      throw Exception('Failed to get Apple identity token');
    }
    return AppleSocialCredential(
      identityToken: identityToken,
      givenName: credential.givenName,
      familyName: credential.familyName,
    );
  }

  @override
  Future<void> signOutGoogle() async {
    await _ensureGoogleSignInInitialized();
    await _googleSignIn.disconnect();
  }
}

/// Service for handling social authentication (Google, Apple).
///
/// This service handles the client-side OAuth flow and sends tokens
/// to the backend for verification and account management.
class SocialAuthService {
  final DioClient _dioClient;
  final SocialAuthPlatform _platform;

  SocialAuthService({
    required DioClient dioClient,
    SocialAuthPlatform? platform,
  }) : _dioClient = dioClient,
       _platform = platform ?? DefaultSocialAuthPlatform();

  /// Initialize Google Sign-In (required for google_sign_in 7.x)
  /// Uses Completer pattern to avoid race conditions on concurrent calls.
  Future<String> _fetchOAuthState() async {
    final response = await _dioClient.get('/auth/social/state');
    final data = response.data['data'] as Map<String, dynamic>?;
    final state = data?['state'] as String?;
    if (state == null || state.length != 64) {
      throw Exception('Invalid OAuth state from server');
    }
    return state;
  }

  /// Sign in with Google.
  ///
  /// Gets the Google ID token from the client and sends it to the backend
  /// for verification. The backend handles user creation/linking and
  /// returns app-specific auth tokens.
  ///
  /// Returns [SocialAuthResult] with user data and tokens,
  /// or null if the user cancelled the sign-in flow.
  Future<SocialAuthResult?> signInWithGoogle() async {
    final idToken = await _platform.signInWithGoogle();
    if (idToken == null) return null;

    final state = await _fetchOAuthState();

    final response = await _dioClient.post(
      '/auth/social/google',
      data: {'idToken': idToken, 'state': state},
    );

    final data = response.data['data'] as Map<String, dynamic>;
    return SocialAuthResult.fromJson(data);
  }

  /// Sign out from Google.
  Future<void> signOutGoogle() async {
    await _platform.signOutGoogle();
  }

  /// Sign in with Apple.
  ///
  /// Gets the Apple identity token from the client and sends it to the backend
  /// for verification. The backend handles user creation/linking and
  /// returns app-specific auth tokens.
  ///
  /// Note: Apple only provides email/name on first authorization.
  /// Subsequent sign-ins return empty values for these fields.
  ///
  /// Returns [SocialAuthResult] with user data and tokens,
  /// or null if the user cancelled the sign-in flow.
  Future<SocialAuthResult?> signInWithApple() async {
    final credential = await _platform.signInWithApple();

    final requestData = <String, dynamic>{
      'identityToken': credential.identityToken,
    };

    if (credential.givenName != null || credential.familyName != null) {
      requestData['fullName'] = {
        'givenName': credential.givenName,
        'familyName': credential.familyName,
      };
    }

    final state = await _fetchOAuthState();
    requestData['state'] = state;

    final response = await _dioClient.post(
      '/auth/social/apple',
      data: requestData,
    );

    final data = response.data['data'] as Map<String, dynamic>;
    return SocialAuthResult.fromJson(data);
  }
}
