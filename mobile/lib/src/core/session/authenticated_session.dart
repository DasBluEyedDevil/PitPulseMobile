import 'package:flutter/foundation.dart';

import '../../features/auth/domain/user.dart';

enum SocialAuthenticationProvider { google, apple }

enum AuthenticatedSessionBootstrapStep {
  sessionProviders,
  webSocket,
  revenueCat,
  serverEntitlement,
  savedGenres,
  pushRegistration,
}

enum AuthenticatedSessionCleanupStep {
  pushTokenUnregister,
  pushReset,
  webSocketDisconnect,
  revenueCatLogout,
  revenueCatListener,
  entitlementReset,
  sessionProviders,
  preferences,
  telemetry,
}

@immutable
class AuthenticatedSessionCleanupResult {
  const AuthenticatedSessionCleanupResult({
    this.failedSteps = const {},
    this.pushToken,
  });

  final Set<AuthenticatedSessionCleanupStep> failedSteps;
  final String? pushToken;

  bool get succeeded => failedSteps.isEmpty;
}

@immutable
class AuthenticatedSessionBootstrapState {
  const AuthenticatedSessionBootstrapState._({
    required this.attempt,
    required this.cleanupAttempts,
    required this.failedSteps,
    required this.failedCleanupSteps,
    required this.isRunning,
    this.userId,
  });

  const AuthenticatedSessionBootstrapState.idle()
    : this._(
        attempt: 0,
        cleanupAttempts: 0,
        failedSteps: const {},
        failedCleanupSteps: const {},
        isRunning: false,
      );

  factory AuthenticatedSessionBootstrapState.running({
    required String userId,
    required int attempt,
  }) {
    return AuthenticatedSessionBootstrapState._(
      userId: userId,
      attempt: attempt,
      cleanupAttempts: 0,
      failedSteps: const {},
      failedCleanupSteps: const {},
      isRunning: true,
    );
  }

  factory AuthenticatedSessionBootstrapState.completed({
    required String userId,
    required int attempt,
    required Set<AuthenticatedSessionBootstrapStep> failedSteps,
    Set<AuthenticatedSessionCleanupStep> failedCleanupSteps = const {},
    int cleanupAttempts = 0,
  }) {
    return AuthenticatedSessionBootstrapState._(
      userId: userId,
      attempt: attempt,
      cleanupAttempts: cleanupAttempts,
      failedSteps: Set.unmodifiable(failedSteps),
      failedCleanupSteps: Set.unmodifiable(failedCleanupSteps),
      isRunning: false,
    );
  }

  factory AuthenticatedSessionBootstrapState.logoutCompleted({
    required Set<AuthenticatedSessionCleanupStep> failedCleanupSteps,
    required int cleanupAttempts,
  }) {
    return AuthenticatedSessionBootstrapState._(
      attempt: 0,
      cleanupAttempts: cleanupAttempts,
      failedSteps: const {},
      failedCleanupSteps: Set.unmodifiable(failedCleanupSteps),
      isRunning: false,
    );
  }

  final String? userId;
  final int attempt;
  final int cleanupAttempts;
  final bool isRunning;
  final Set<AuthenticatedSessionBootstrapStep> failedSteps;
  final Set<AuthenticatedSessionCleanupStep> failedCleanupSteps;

  bool get isDegraded =>
      !isRunning && (failedSteps.isNotEmpty || failedCleanupSteps.isNotEmpty);

  bool get canRetry => userId != null && isDegraded;

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        other is AuthenticatedSessionBootstrapState &&
            other.userId == userId &&
            other.attempt == attempt &&
            other.cleanupAttempts == cleanupAttempts &&
            other.isRunning == isRunning &&
            setEquals(other.failedSteps, failedSteps) &&
            setEquals(other.failedCleanupSteps, failedCleanupSteps);
  }

  @override
  int get hashCode {
    return Object.hash(
      userId,
      attempt,
      cleanupAttempts,
      isRunning,
      Object.hashAll(failedSteps),
      Object.hashAll(failedCleanupSteps),
    );
  }
}

abstract interface class AuthenticatedSessionIntegrations {
  Future<void> invalidateSessionProviders(User user);

  Future<void> connectWebSocket(User user);

  /// Returns the known RevenueCat entitlement, or null when it is unknown.
  Future<bool?> synchronizeRevenueCat(User user);

  Future<bool> refreshServerEntitlement(User user);

  Future<void> synchronizeSavedGenres(User user);

  Future<void> registerPushNotifications(User user);

  Future<AuthenticatedSessionCleanupResult> resetForAccountTransition(
    User previousUser, {
    Set<AuthenticatedSessionCleanupStep>? retrySteps,
    String? pushToken,
  });

  Future<AuthenticatedSessionCleanupResult> cleanupForLogout({
    Set<AuthenticatedSessionCleanupStep>? retrySteps,
    String? pushToken,
  });
}
