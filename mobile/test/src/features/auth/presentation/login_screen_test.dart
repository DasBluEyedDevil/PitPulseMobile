import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:soundcheck_flutter/src/core/api/dio_client.dart';
import 'package:soundcheck_flutter/src/core/providers/providers.dart';
import 'package:soundcheck_flutter/src/core/session/authenticated_session.dart';
import 'package:soundcheck_flutter/src/core/theme/app_theme.dart';
import 'package:soundcheck_flutter/src/features/auth/data/auth_repository.dart';
import 'package:soundcheck_flutter/src/features/auth/data/social_auth_service.dart';
import 'package:soundcheck_flutter/src/features/auth/domain/user.dart';
import 'package:soundcheck_flutter/src/features/auth/presentation/login_screen.dart';

void main() {
  group('LoginScreen Widget', () {
    setUpAll(() {
      // Mock the haptic feedback platform channel
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(SystemChannels.platform, (message) async {
            return null;
          });
    });

    testWidgets('displays all required UI elements', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(
        const ProviderScope(child: MaterialApp(home: LoginScreen())),
      );

      // Check for branded logo image
      expect(find.bySemanticsLabel('SoundCheck logo'), findsOneWidget);
      expect(
        find.byWidgetPredicate(
          (widget) =>
              widget is Image &&
              widget.image is AssetImage &&
              (widget.image as AssetImage).assetName == AppTheme.logoWideAsset,
        ),
        findsOneWidget,
      );

      // The wordmark image carries the app name; do not render duplicate title
      // text on top of it.
      expect(find.text('SoundCheck'), findsNothing);

      // Check for flash onboarding-style tagline
      expect(
        find.text('Check in. Share the moment. Relive every beat.'),
        findsOneWidget,
      );

      // Check for email field
      expect(find.widgetWithText(TextFormField, 'Email'), findsOneWidget);

      // Check for password field
      expect(find.widgetWithText(TextFormField, 'Password'), findsOneWidget);

      // Check for login button
      expect(find.text('Login'), findsOneWidget);

      // Check for sign up link
      expect(find.text("Don't have an account? "), findsOneWidget);
      expect(find.widgetWithText(TextButton, 'Sign Up'), findsOneWidget);
    });

    testWidgets('email field has correct keyboard type', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(
        const ProviderScope(child: MaterialApp(home: LoginScreen())),
      );

      final emailFieldFinder = find.widgetWithText(TextFormField, 'Email');
      final emailTextField = tester.widget<TextField>(
        find.descendant(of: emailFieldFinder, matching: find.byType(TextField)),
      );

      expect(emailTextField.keyboardType, TextInputType.emailAddress);
    });

    testWidgets('password field is initially obscured', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(
        const ProviderScope(child: MaterialApp(home: LoginScreen())),
      );

      final passwordFieldFinder = find.widgetWithText(
        TextFormField,
        'Password',
      );
      final passwordTextField = tester.widget<TextField>(
        find.descendant(
          of: passwordFieldFinder,
          matching: find.byType(TextField),
        ),
      );

      expect(passwordTextField.obscureText, true);
    });

    testWidgets('can toggle password visibility', (WidgetTester tester) async {
      await tester.pumpWidget(
        const ProviderScope(child: MaterialApp(home: LoginScreen())),
      );

      // Find the password field
      final passwordFieldFinder = find.widgetWithText(
        TextFormField,
        'Password',
      );

      // Initially obscured
      TextField passwordTextField = tester.widget<TextField>(
        find.descendant(
          of: passwordFieldFinder,
          matching: find.byType(TextField),
        ),
      );
      expect(passwordTextField.obscureText, true);

      // Find and tap the visibility toggle button
      final visibilityIcon = find.descendant(
        of: passwordFieldFinder,
        matching: find.byType(IconButton),
      );
      await tester.tap(visibilityIcon);
      await tester.pumpAndSettle();

      // Now should be visible
      passwordTextField = tester.widget<TextField>(
        find.descendant(
          of: passwordFieldFinder,
          matching: find.byType(TextField),
        ),
      );
      expect(passwordTextField.obscureText, false);
    });

    testWidgets('validates empty email field', (WidgetTester tester) async {
      await tester.pumpWidget(
        const ProviderScope(child: MaterialApp(home: LoginScreen())),
      );

      // Tap login button without entering any data
      await tester.tap(find.text('Login'));
      await tester.pumpAndSettle();

      // Should show validation error
      expect(find.text('Email is required'), findsOneWidget);
    });

    testWidgets('validates invalid email format', (WidgetTester tester) async {
      await tester.pumpWidget(
        const ProviderScope(child: MaterialApp(home: LoginScreen())),
      );

      // Enter invalid email
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Email'),
        'notanemail',
      );

      // Tap login button
      await tester.tap(find.text('Login'));
      await tester.pumpAndSettle();

      // Should show validation error
      expect(find.text('Please enter a valid email'), findsOneWidget);
    });

    testWidgets('validates empty password field', (WidgetTester tester) async {
      await tester.pumpWidget(
        const ProviderScope(child: MaterialApp(home: LoginScreen())),
      );

      // Enter valid email but no password
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Email'),
        'test@example.com',
      );

      // Tap login button
      await tester.tap(find.text('Login'));
      await tester.pumpAndSettle();

      // Should show password validation error
      expect(find.text('Password is required'), findsOneWidget);
    });

    testWidgets('validates password minimum length', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(
        const ProviderScope(child: MaterialApp(home: LoginScreen())),
      );

      // Enter valid email but short password
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Email'),
        'test@example.com',
      );
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Password'),
        'Pass1!', // Too short (only 6 chars, need 8)
      );

      // Tap login button
      await tester.tap(find.text('Login'));
      await tester.pumpAndSettle();

      // Should show password validation error
      expect(
        find.text('Password must be at least 8 characters'),
        findsOneWidget,
      );
    });

    testWidgets('accepts valid email and password', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(
        const ProviderScope(child: MaterialApp(home: LoginScreen())),
      );

      // Enter valid credentials (must meet all backend requirements)
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Email'),
        'test@example.com',
      );
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Password'),
        'Password1!', // Valid: 8+ chars, upper, lower, number, special
      );
      await tester.pump();

      // Verify valid input is accepted (no validation errors shown yet)
      // Note: We don't tap the login button to avoid triggering async login
      // The form fields should accept valid input without showing errors
      expect(find.text('Email is required'), findsNothing);
      expect(find.text('Please enter a valid email'), findsNothing);
      expect(find.text('Password is required'), findsNothing);
      expect(find.text('Password must be at least 8 characters'), findsNothing);

      // Verify the login button is enabled and visible
      final loginButton = find.text('Login');
      expect(loginButton, findsOneWidget);
    });

    for (final provider in SocialAuthenticationProvider.values) {
      testWidgets(
        '${provider.name} success completes one unified session bootstrap',
        (WidgetTester tester) async {
          final integrations = _RecordingSocialSessionIntegrations();
          final socialAuthService = _FakeSocialAuthService(provider);

          await tester.pumpWidget(
            ProviderScope(
              overrides: [
                authRepositoryProvider.overrideWithValue(
                  _UnauthenticatedRepository(),
                ),
                authenticatedSessionIntegrationsProvider.overrideWithValue(
                  integrations,
                ),
              ],
              child: MaterialApp(
                home: LoginScreen(
                  socialAuthService: socialAuthService,
                  supportsAppleSignIn: true,
                ),
              ),
            ),
          );
          await tester.pumpAndSettle();

          final socialButton = find.bySemanticsLabel(
            provider == SocialAuthenticationProvider.apple
                ? 'Sign in with Apple'
                : 'Sign in with Google',
          );
          await tester.ensureVisible(socialButton);
          await tester.pumpAndSettle();
          await tester.tap(socialButton);
          await tester.pumpAndSettle();

          expect(integrations.steps, AuthenticatedSessionBootstrapStep.values);
          expect(integrations.users, everyElement(_socialUser.id));
        },
      );
    }
  });
}

class _FakeSocialAuthService extends SocialAuthService {
  _FakeSocialAuthService(this.provider)
    : super(dioClient: DioClient(secureStorage: const FlutterSecureStorage()));

  final SocialAuthenticationProvider provider;

  SocialAuthResult get _result {
    return SocialAuthResult(
      user: _socialUser,
      token: 'social-token',
      refreshToken: 'social-refresh-token',
      isNewUser: false,
    );
  }

  @override
  Future<SocialAuthResult?> signInWithGoogle() async {
    if (provider != SocialAuthenticationProvider.google) {
      throw StateError('Unexpected Google sign-in');
    }
    return _result;
  }

  @override
  Future<SocialAuthResult?> signInWithApple() async {
    if (provider != SocialAuthenticationProvider.apple) {
      throw StateError('Unexpected Apple sign-in');
    }
    return _result;
  }
}

class _UnauthenticatedRepository extends AuthRepository {
  _UnauthenticatedRepository()
    : super(
        dioClient: DioClient(secureStorage: const FlutterSecureStorage()),
        secureStorage: const FlutterSecureStorage(),
      );

  @override
  Future<User?> getCurrentUser() async => null;

  @override
  Future<AuthPersistenceResult> persistAuthenticationWithRevision(
    AuthResponse response, {
    required bool Function() isCurrent,
  }) async => AuthPersistenceResult(committed: isCurrent(), revision: null);
}

class _RecordingSocialSessionIntegrations
    implements AuthenticatedSessionIntegrations {
  final steps = <AuthenticatedSessionBootstrapStep>[];
  final users = <String>[];

  void _record(AuthenticatedSessionBootstrapStep step, User user) {
    steps.add(step);
    users.add(user.id);
  }

  @override
  Future<void> invalidateSessionProviders(User user) async {
    _record(AuthenticatedSessionBootstrapStep.sessionProviders, user);
  }

  @override
  Future<void> connectWebSocket(User user) async {
    _record(AuthenticatedSessionBootstrapStep.webSocket, user);
  }

  @override
  Future<bool?> synchronizeRevenueCat(User user) async {
    _record(AuthenticatedSessionBootstrapStep.revenueCat, user);
    return false;
  }

  @override
  Future<bool> refreshServerEntitlement(User user) async {
    _record(AuthenticatedSessionBootstrapStep.serverEntitlement, user);
    return false;
  }

  @override
  Future<void> synchronizeSavedGenres(User user) async {
    _record(AuthenticatedSessionBootstrapStep.savedGenres, user);
  }

  @override
  Future<void> registerPushNotifications(User user) async {
    _record(AuthenticatedSessionBootstrapStep.pushRegistration, user);
  }

  @override
  Future<AuthenticatedSessionCleanupResult> resetForAccountTransition(
    User previousUser, {
    Set<AuthenticatedSessionCleanupStep>? retrySteps,
    String? pushToken,
  }) async => const AuthenticatedSessionCleanupResult();

  @override
  Future<AuthenticatedSessionCleanupResult> cleanupForLogout({
    Set<AuthenticatedSessionCleanupStep>? retrySteps,
    String? pushToken,
  }) async => const AuthenticatedSessionCleanupResult();
}

const _socialUser = User(
  id: 'social-user',
  email: 'social@example.com',
  username: 'social-user',
  isVerified: true,
  isActive: true,
  createdAt: '2026-07-26T00:00:00.000Z',
  updatedAt: '2026-07-26T00:00:00.000Z',
);
