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

@immutable
class AuthenticatedSessionBootstrapState {
  const AuthenticatedSessionBootstrapState._({
    required this.attempt,
    required this.failedSteps,
    required this.isRunning,
    this.userId,
  });

  const AuthenticatedSessionBootstrapState.idle()
    : this._(attempt: 0, failedSteps: const {}, isRunning: false);

  factory AuthenticatedSessionBootstrapState.running({
    required String userId,
    required int attempt,
  }) {
    return AuthenticatedSessionBootstrapState._(
      userId: userId,
      attempt: attempt,
      failedSteps: const {},
      isRunning: true,
    );
  }

  factory AuthenticatedSessionBootstrapState.completed({
    required String userId,
    required int attempt,
    required Set<AuthenticatedSessionBootstrapStep> failedSteps,
  }) {
    return AuthenticatedSessionBootstrapState._(
      userId: userId,
      attempt: attempt,
      failedSteps: Set.unmodifiable(failedSteps),
      isRunning: false,
    );
  }

  final String? userId;
  final int attempt;
  final bool isRunning;
  final Set<AuthenticatedSessionBootstrapStep> failedSteps;

  bool get isDegraded => !isRunning && failedSteps.isNotEmpty;

  bool get canRetry => userId != null && isDegraded;

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        other is AuthenticatedSessionBootstrapState &&
            other.userId == userId &&
            other.attempt == attempt &&
            other.isRunning == isRunning &&
            setEquals(other.failedSteps, failedSteps);
  }

  @override
  int get hashCode {
    return Object.hash(userId, attempt, isRunning, Object.hashAll(failedSteps));
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

  Future<void> resetForAccountTransition(User previousUser);

  Future<void> cleanupForLogout();
}
