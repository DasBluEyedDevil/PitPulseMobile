// Firebase project metadata for SoundCheck.
//
// Do not commit Firebase API keys here. Supply them at build/run time:
//   --dart-define=FIREBASE_ANDROID_API_KEY=...
//   --dart-define=FIREBASE_IOS_API_KEY=...
import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;
import 'package:flutter/foundation.dart'
    show defaultTargetPlatform, kDebugMode, kIsWeb, TargetPlatform;

/// Returned by [DefaultFirebaseOptions.currentPlatform] when no real Firebase
/// configuration has been provided for the platform. Callers must treat this
/// as "Firebase is unavailable" and skip [Firebase.initializeApp].
class FirebaseNotConfigured implements Exception {
  const FirebaseNotConfigured(this.reason);
  final String reason;

  @override
  String toString() => 'FirebaseNotConfigured: $reason';
}

class DefaultFirebaseOptions {
  /// Returns platform-specific [FirebaseOptions]. Throws
  /// [FirebaseNotConfigured] when the API keys were not injected, so
  /// production builds fail loudly instead of silently initialising a broken
  /// Firebase app. In debug mode this check is softened to allow local dev
  /// without a real Firebase project.
  static FirebaseOptions get currentPlatform {
    if (kIsWeb) {
      throw const FirebaseNotConfigured('Firebase is not configured for web.');
    }
    final options = switch (defaultTargetPlatform) {
      TargetPlatform.android => android,
      TargetPlatform.iOS => ios,
      _ => throw const FirebaseNotConfigured(
        'DefaultFirebaseOptions are not supported for this platform.',
      ),
    };

    if (_isPlaceholder(options) && !kDebugMode) {
      throw const FirebaseNotConfigured(
        'Firebase API keys were not supplied. Build with '
        '--dart-define=FIREBASE_ANDROID_API_KEY=... and/or '
        '--dart-define=FIREBASE_IOS_API_KEY=... before building a release.',
      );
    }
    return options;
  }

  static bool _isPlaceholder(FirebaseOptions options) {
    return options.apiKey == _placeholderApiKey ||
        options.projectId == _placeholderProjectId;
  }

  static const String _placeholderApiKey = 'REPLACE_ME';
  static const String _placeholderProjectId = 'soundcheck-placeholder';
  static const String _androidApiKey = String.fromEnvironment(
    'FIREBASE_ANDROID_API_KEY',
    defaultValue: _placeholderApiKey,
  );
  static const String _iosApiKey = String.fromEnvironment(
    'FIREBASE_IOS_API_KEY',
    defaultValue: _placeholderApiKey,
  );

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: _androidApiKey,
    appId: '1:843136025510:android:7ee8b1c4f09d78a3a74567',
    messagingSenderId: '843136025510',
    projectId: 'soundcheck-prod-e973c',
    storageBucket: 'soundcheck-prod-e973c.firebasestorage.app',
  );

  static const FirebaseOptions ios = FirebaseOptions(
    apiKey: _iosApiKey,
    appId: '1:843136025510:ios:846d4b7346bd2e6da74567',
    messagingSenderId: '843136025510',
    projectId: 'soundcheck-prod-e973c',
    storageBucket: 'soundcheck-prod-e973c.firebasestorage.app',
    iosBundleId: 'com.9thlevelsoftware.soundcheck',
  );
}
