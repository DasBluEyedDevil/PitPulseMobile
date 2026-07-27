import 'dart:async';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:geolocator/geolocator.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:sentry_flutter/sentry_flutter.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../api/dio_client.dart';
import '../session/authenticated_session.dart';
import '../services/analytics_service.dart';
import '../services/log_service.dart';
import '../services/push_notification_service.dart';
import '../services/websocket_service.dart';
import '../../shared/services/location_service.dart';
import '../../features/auth/data/auth_repository.dart';
import '../../features/auth/domain/user.dart';
import '../../features/badges/presentation/badge_providers.dart';
import '../../features/bands/presentation/providers/band_providers.dart';
import '../../features/checkins/presentation/providers/checkin_providers.dart';
import '../../features/discover/presentation/providers/discover_providers.dart';
import '../../features/events/presentation/providers/event_providers.dart';
import '../../features/feed/presentation/providers/feed_providers.dart';
import '../../features/notifications/presentation/providers/notification_providers.dart';
import '../../features/profile/presentation/providers/profile_providers.dart';
import '../../features/search/data/discovery_providers.dart';
import '../../features/search/data/search_providers.dart';
import '../../features/sharing/presentation/share_providers.dart';
import '../../features/subscription/presentation/subscription_service.dart';
import '../../features/subscription/presentation/subscription_providers.dart';
import '../../features/trending/presentation/providers/trending_providers.dart';
import '../../features/verification/presentation/providers/claim_providers.dart';
import '../../features/wrapped/presentation/wrapped_providers.dart';
import '../../features/venues/data/venue_repository.dart';
import '../../features/bands/data/band_repository.dart';
import '../../features/bands/data/wishlist_repository.dart';
import '../../features/badges/data/badge_repository.dart';
import '../../features/checkins/data/checkin_repository.dart';
import '../../features/feed/data/feed_repository.dart';
import '../../features/notifications/data/notification_repository.dart';
import '../../features/onboarding/presentation/onboarding_provider.dart';
import '../../features/profile/data/profile_repository.dart';
import '../../features/discover/data/discovery_repository.dart';

part 'providers.g.dart';

const _authenticatedSessionIntegrationTimeout = Duration(seconds: 15);

@Riverpod(keepAlive: true)
WebSocketService webSocketService(Ref ref) {
  final service = WebSocketService();
  ref.onDispose(service.dispose);
  return service;
}

@Riverpod(keepAlive: true)
FlutterSecureStorage secureStorage(Ref ref) {
  return const FlutterSecureStorage();
}

@Riverpod(keepAlive: true)
DioClient dioClient(Ref ref) {
  final secureStorage = ref.watch(secureStorageProvider);
  return DioClient(
    secureStorage: secureStorage,
    onAuthFailure: () {
      // Force auth state to re-evaluate; getCurrentUser() will return null
      // because the interceptor already wiped the stored credentials.
      ref.invalidate(authStateProvider);
    },
  );
}

@Riverpod(keepAlive: true)
AuthRepository authRepository(Ref ref) {
  final dioClient = ref.watch(dioClientProvider);
  final secureStorage = ref.watch(secureStorageProvider);
  return AuthRepository(dioClient: dioClient, secureStorage: secureStorage);
}

@Riverpod(keepAlive: true)
VenueRepository venueRepository(Ref ref) {
  final dioClient = ref.watch(dioClientProvider);
  return VenueRepository(dioClient: dioClient);
}

@Riverpod(keepAlive: true)
BandRepository bandRepository(Ref ref) {
  final dioClient = ref.watch(dioClientProvider);
  return BandRepository(dioClient: dioClient);
}

@Riverpod(keepAlive: true)
WishlistRepository wishlistRepository(Ref ref) {
  final dioClient = ref.watch(dioClientProvider);
  return WishlistRepository(dioClient: dioClient);
}

@Riverpod(keepAlive: true)
BadgeRepository badgeRepository(Ref ref) {
  final dioClient = ref.watch(dioClientProvider);
  return BadgeRepository(dioClient: dioClient);
}

@Riverpod(keepAlive: true)
CheckInRepository checkInRepository(Ref ref) {
  final dioClient = ref.watch(dioClientProvider);
  return CheckInRepository(dioClient: dioClient);
}

@Riverpod(keepAlive: true)
NotificationRepository notificationRepository(Ref ref) {
  final dioClient = ref.watch(dioClientProvider);
  return NotificationRepository(dioClient: dioClient);
}

@Riverpod(keepAlive: true)
FeedRepository feedRepository(Ref ref) {
  final dioClient = ref.watch(dioClientProvider);
  return FeedRepository(dioClient: dioClient);
}

@Riverpod(keepAlive: true)
PushNotificationService pushNotificationService(Ref ref) {
  final feed = ref.watch(feedRepositoryProvider);
  final service = PushNotificationService(feedRepository: feed);
  ref.onDispose(() => unawaited(service.dispose()));
  return service;
}

@Riverpod(keepAlive: true)
ProfileRepository profileRepository(Ref ref) {
  final dioClient = ref.watch(dioClientProvider);
  return ProfileRepository(dioClient: dioClient);
}

@Riverpod(keepAlive: true)
DiscoveryRepository discoveryRepository(Ref ref) {
  final dioClient = ref.watch(dioClientProvider);
  return DiscoveryRepository(dioClient: dioClient);
}

@Riverpod(keepAlive: true)
AuthenticatedSessionIntegrations authenticatedSessionIntegrations(Ref ref) {
  return _DefaultAuthenticatedSessionIntegrations(ref);
}

@Riverpod(keepAlive: true)
SubscriptionSessionClient subscriptionSessionClient(Ref ref) {
  return const DefaultSubscriptionSessionClient();
}

@Riverpod(keepAlive: true)
class AuthenticatedSessionBootstrapStatus
    extends _$AuthenticatedSessionBootstrapStatus {
  @override
  AuthenticatedSessionBootstrapState build() {
    return const AuthenticatedSessionBootstrapState.idle();
  }

  void start(String userId) {
    final attempt = state.userId == userId ? state.attempt + 1 : 1;
    state = AuthenticatedSessionBootstrapState.running(
      userId: userId,
      attempt: attempt,
    );
  }

  void complete(
    String userId,
    Set<AuthenticatedSessionBootstrapStep> failedSteps, {
    Set<AuthenticatedSessionCleanupStep> failedCleanupSteps = const {},
    int cleanupAttempts = 0,
  }) {
    state = AuthenticatedSessionBootstrapState.completed(
      userId: userId,
      attempt: state.attempt,
      failedSteps: failedSteps,
      failedCleanupSteps: failedCleanupSteps,
      cleanupAttempts: cleanupAttempts,
    );
  }

  void completeLogout(
    Set<AuthenticatedSessionCleanupStep> failedCleanupSteps, {
    required int cleanupAttempts,
  }) {
    state = AuthenticatedSessionBootstrapState.logoutCompleted(
      failedCleanupSteps: failedCleanupSteps,
      cleanupAttempts: cleanupAttempts,
    );
  }

  void reset() {
    state = const AuthenticatedSessionBootstrapState.idle();
  }
}

class _DefaultAuthenticatedSessionIntegrations
    implements AuthenticatedSessionIntegrations {
  _DefaultAuthenticatedSessionIntegrations(this._ref);

  final Ref _ref;

  @override
  Future<void> invalidateSessionProviders(User user) async {
    _invalidateSessionProviders();
  }

  void _invalidateSessionProviders() {
    AuthenticatedSessionCacheInvalidator(
      (provider) => _ref.invalidate(provider as dynamic),
    ).invalidateAll();
  }

  @override
  Future<void> connectWebSocket(User user) async {
    final token = await _ref
        .read(secureStorageProvider)
        .read(key: 'auth_token');
    if (token == null || token.isEmpty) {
      throw StateError('Authenticated WebSocket token is unavailable');
    }

    final service = _ref.read(webSocketServiceProvider);
    service.disconnect(clearCredentials: true);
    try {
      await service
          .connect(authToken: token, userId: user.id)
          .timeout(_authenticatedSessionIntegrationTimeout);
    } catch (_) {
      service.disconnect(clearCredentials: true);
      rethrow;
    }
    if (!service.isConnected) {
      throw StateError('Authenticated WebSocket connection is unavailable');
    }
  }

  @override
  Future<bool?> synchronizeRevenueCat(User user) async {
    final client = _ref.read(subscriptionSessionClientProvider);
    final identified = await client
        .login(user.id)
        .timeout(_authenticatedSessionIntegrationTimeout);
    if (!identified) return null;

    final premiumNotifier = _ref.read(isPremiumProvider.notifier);
    final entitlementGeneration = premiumNotifier.sessionGeneration;
    client.setCustomerInfoUpdateListener((customerInfo) {
      unawaited(
        premiumNotifier.reconcileCustomerInfo(
          customerInfo,
          generation: entitlementGeneration,
        ),
      );
    });

    final customerInfo = await client.getCustomerInfo().timeout(
      _authenticatedSessionIntegrationTimeout,
    );
    if (customerInfo == null) return null;
    return SubscriptionService.hasUnlimitedEntitlement(customerInfo);
  }

  @override
  Future<bool> refreshServerEntitlement(User user) async {
    _ref.invalidate(serverSubscriptionStatusProvider);
    final status = await _ref
        .read(serverSubscriptionStatusProvider.future)
        .timeout(_authenticatedSessionIntegrationTimeout);
    return status.isPremium;
  }

  @override
  Future<void> synchronizeSavedGenres(User user) async {
    await _ref
        .read(genrePersistenceProvider.notifier)
        .syncGenresToBackendIfNeeded()
        .timeout(_authenticatedSessionIntegrationTimeout);
  }

  @override
  Future<void> registerPushNotifications(User user) async {
    final service = _ref.read(pushNotificationServiceProvider);
    try {
      await service.initialize().timeout(
        _authenticatedSessionIntegrationTimeout,
      );
    } catch (_) {
      await service.resetForLogout().timeout(
        _authenticatedSessionIntegrationTimeout,
      );
      rethrow;
    }
    if (!service.isInitialized) {
      throw StateError('Push notification registration is unavailable');
    }
  }

  @override
  Future<AuthenticatedSessionCleanupResult> resetForAccountTransition(
    User previousUser, {
    Set<AuthenticatedSessionCleanupStep>? retrySteps,
    String? pushToken,
  }) async {
    final pushService = _ref.read(pushNotificationServiceProvider);
    final tokenToUnregister = pushToken ?? pushService.currentToken;
    final failures = <AuthenticatedSessionCleanupStep>{};

    await _runCleanupStep(
      AuthenticatedSessionCleanupStep.pushTokenUnregister,
      retrySteps,
      failures,
      () => _unregisterPushToken(tokenToUnregister),
    );
    await _runCleanupStep(
      AuthenticatedSessionCleanupStep.pushReset,
      retrySteps,
      failures,
      pushService.resetForLogout,
    );
    await _runCleanupStep(
      AuthenticatedSessionCleanupStep.webSocketDisconnect,
      retrySteps,
      failures,
      () async {
        _ref.read(webSocketServiceProvider).disconnect(clearCredentials: true);
      },
    );
    await _runCleanupStep(
      AuthenticatedSessionCleanupStep.revenueCatLogout,
      retrySteps,
      failures,
      _ref.read(subscriptionSessionClientProvider).logout,
    );
    await _runCleanupStep(
      AuthenticatedSessionCleanupStep.revenueCatListener,
      retrySteps,
      failures,
      () async {
        _ref
            .read(subscriptionSessionClientProvider)
            .setCustomerInfoUpdateListener(null);
      },
    );
    await _runCleanupStep(
      AuthenticatedSessionCleanupStep.entitlementReset,
      retrySteps,
      failures,
      () async {
        _ref.read(isPremiumProvider.notifier).beginSession();
        _ref.invalidate(revenueCatCustomerInfoProvider);
        _ref.invalidate(serverSubscriptionStatusProvider);
      },
    );

    return AuthenticatedSessionCleanupResult(
      failedSteps: Set.unmodifiable(failures),
      pushToken: tokenToUnregister,
    );
  }

  @override
  Future<AuthenticatedSessionCleanupResult> cleanupForLogout({
    Set<AuthenticatedSessionCleanupStep>? retrySteps,
    String? pushToken,
  }) async {
    final pushService = _ref.read(pushNotificationServiceProvider);
    final tokenToUnregister = pushToken ?? pushService.currentToken;
    final failures = <AuthenticatedSessionCleanupStep>{};

    await _runCleanupStep(
      AuthenticatedSessionCleanupStep.pushTokenUnregister,
      retrySteps,
      failures,
      () => _unregisterPushToken(tokenToUnregister),
    );
    await _runCleanupStep(
      AuthenticatedSessionCleanupStep.pushReset,
      retrySteps,
      failures,
      pushService.resetForLogout,
    );
    await _runCleanupStep(
      AuthenticatedSessionCleanupStep.webSocketDisconnect,
      retrySteps,
      failures,
      () async {
        _ref.read(webSocketServiceProvider).disconnect(clearCredentials: true);
      },
    );
    await _runCleanupStep(
      AuthenticatedSessionCleanupStep.revenueCatLogout,
      retrySteps,
      failures,
      _ref.read(subscriptionSessionClientProvider).logout,
    );
    await _runCleanupStep(
      AuthenticatedSessionCleanupStep.revenueCatListener,
      retrySteps,
      failures,
      () async {
        _ref
            .read(subscriptionSessionClientProvider)
            .setCustomerInfoUpdateListener(null);
      },
    );
    await _runCleanupStep(
      AuthenticatedSessionCleanupStep.entitlementReset,
      retrySteps,
      failures,
      () async {
        _ref.read(isPremiumProvider.notifier).beginSession();
        _ref.invalidate(revenueCatCustomerInfoProvider);
        _ref.invalidate(serverSubscriptionStatusProvider);
      },
    );
    await _runCleanupStep(
      AuthenticatedSessionCleanupStep.sessionProviders,
      retrySteps,
      failures,
      () async => _invalidateSessionProviders(),
    );
    await _runCleanupStep(
      AuthenticatedSessionCleanupStep.preferences,
      retrySteps,
      failures,
      () async {
        final preferences = await SharedPreferences.getInstance();
        final keys = preferences.getKeys();
        const userScopedPrefixes = [
          'user_',
          'feed_',
          'onboarding_',
          'notification_',
        ];
        for (final key in keys) {
          if (userScopedPrefixes.any(key.startsWith)) {
            await preferences.remove(key);
          }
        }
      },
    );
    await _runCleanupStep(
      AuthenticatedSessionCleanupStep.telemetry,
      retrySteps,
      failures,
      () async {
        Sentry.configureScope((scope) => scope.setUser(null));
        await AnalyticsService.clearUserId();
      },
    );

    return AuthenticatedSessionCleanupResult(
      failedSteps: Set.unmodifiable(failures),
      pushToken: tokenToUnregister,
    );
  }

  Future<void> _unregisterPushToken(String? pushToken) async {
    if (pushToken == null) return;
    final result = await _ref
        .read(feedRepositoryProvider)
        .unregisterDeviceToken(pushToken);
    result.fold<void>((failure) => throw Exception(failure.message), (_) {});
  }

  Future<void> _runCleanupStep(
    AuthenticatedSessionCleanupStep step,
    Set<AuthenticatedSessionCleanupStep>? requestedSteps,
    Set<AuthenticatedSessionCleanupStep> failures,
    Future<void> Function() operation,
  ) async {
    if (requestedSteps != null && !requestedSteps.contains(step)) return;
    try {
      await operation().timeout(_authenticatedSessionIntegrationTimeout);
    } catch (error, stackTrace) {
      failures.add(step);
      LogService.e(
        'Authenticated session ${step.name} cleanup failed',
        error,
        stackTrace,
      );
    }
  }
}

/// Invalidates every provider whose state can contain data for the current user.
///
/// Keeping the inventory in one testable catalog prevents account transitions
/// from accidentally retaining a previous user's cached queries or mutations.
class AuthenticatedSessionCacheInvalidator {
  const AuthenticatedSessionCacheInvalidator(this._invalidate);

  final void Function(Object provider) _invalidate;

  void invalidateAll() {
    for (final provider in _currentUserProviders) {
      _invalidate(provider);
    }
  }

  static final List<Object> _currentUserProviders = [
    globalFeedProvider,
    friendsFeedProvider,
    eventFeedProvider,
    eventsFeedProvider,
    happeningNowProvider,
    unseenCountsProvider,
    newCheckinCountProvider,
    activeEventIdsProvider,
    notificationFeedProvider,
    unreadNotificationCountProvider,
    markNotificationAsReadProvider,
    markAllNotificationsAsReadProvider,
    deleteNotificationProvider,
    badgeProgressProvider,
    badgeRarityProvider,
    myBadgesProvider,
    badgeCollectionProvider,
    myClaimsProvider,
    entityStatsProvider,
    wrappedStatsProvider,
    wrappedDetailProvider,
    wrappedSummaryCardProvider,
    revenueCatCustomerInfoProvider,
    serverSubscriptionStatusProvider,
    userRsvpsProvider,
    friendsGoingProvider,
    userSuggestionsProvider,
    discoverBandSearchProvider,
    discoverVenueSearchProvider,
    discoverUserSearchProvider,
    discoverEventSearchProvider,
    discoverSearchResultsProvider,
    recommendedEventsProvider,
    nearbyUpcomingEventsProvider,
    trendingNearbyEventsProvider,
    genreEventsProvider,
    trendingFeedProvider,
    bandGlobalCheckinsProvider,
    bandUserCheckinsProvider,
    searchBandsForCheckinProvider,
    vibeTagsProvider,
    bandCheckInsProvider,
    venueCheckInsProvider,
    userCheckInsProvider,
    checkInDetailProvider,
    checkInToastsProvider,
    checkInCommentsProvider,
    toastCheckInProvider,
    addCommentProvider,
    deleteCommentProvider,
    userCheckInStatsProvider,
    venueRecentBandsProvider,
    nearbyEventsProvider,
    createEventCheckInProvider,
    createManualCheckInProvider,
    submitRatingsProvider,
    userRecentCheckinsProvider,
    userGenreStatsProvider,
    userBadgesProvider,
    concertCredProvider,
    unifiedSearchProvider,
    combinedSearchResultsProvider,
    checkinCardProvider,
    badgeCardProvider,
  ];
}

class _PendingTransitionCleanup {
  const _PendingTransitionCleanup({
    required this.previousUser,
    required this.result,
  });

  final User previousUser;
  final AuthenticatedSessionCleanupResult result;
}

@Riverpod(keepAlive: true)
class AuthState extends _$AuthState {
  User? _activeSessionUser;
  _PendingTransitionCleanup? _pendingTransitionCleanup;
  int _sessionGeneration = 0;
  Future<void>? _sessionOperationTail;

  @override
  Future<User?> build() async {
    final authRepository = ref.watch(authRepositoryProvider);
    final user = await authRepository.getCurrentUser();

    if (user != null) {
      final generation = ++_sessionGeneration;
      await _scheduleAuthenticatedSessionBootstrap(
        user,
        generation: generation,
        publishUser: false,
      );
    }

    return user;
  }

  Future<void> login(String email, String password) async {
    final generation = ++_sessionGeneration;
    state = const AsyncValue.loading();
    try {
      final authRepository = ref.read(authRepositoryProvider);
      final result = await authRepository.login(
        LoginRequest(email: email, password: password),
      );

      final authResponse = result.fold<AuthResponse>(
        (failure) => throw Exception(failure.message),
        (response) => response,
      );
      if (!_isCurrentSession(generation)) return;
      await _scheduleAuthenticatedSessionBootstrap(
        authResponse.user,
        generation: generation,
        publishUser: true,
      );
    } catch (error, stackTrace) {
      if (_isCurrentSession(generation)) {
        state = AsyncValue.error(error, stackTrace);
      }
    }
  }

  Future<void> register({
    required String email,
    required String password,
    required String username,
    String? firstName,
    String? lastName,
  }) async {
    final generation = ++_sessionGeneration;
    state = const AsyncValue.loading();
    try {
      final authRepository = ref.read(authRepositoryProvider);
      final result = await authRepository.register(
        RegisterRequest(
          email: email,
          password: password,
          username: username,
          firstName: firstName,
          lastName: lastName,
        ),
      );

      final authResponse = result.fold<AuthResponse>(
        (failure) => throw Exception(failure.message),
        (response) => response,
      );
      if (!_isCurrentSession(generation)) return;
      await _scheduleAuthenticatedSessionBootstrap(
        authResponse.user,
        generation: generation,
        publishUser: true,
      );
    } catch (error, stackTrace) {
      if (_isCurrentSession(generation)) {
        state = AsyncValue.error(error, stackTrace);
      }
    }
  }

  Future<void> completeSocialSignIn(
    User user, {
    required SocialAuthenticationProvider provider,
  }) async {
    final generation = ++_sessionGeneration;
    state = const AsyncValue.loading();
    await _scheduleAuthenticatedSessionBootstrap(
      user,
      generation: generation,
      publishUser: true,
    );
  }

  Future<void> logout() async {
    final generation = ++_sessionGeneration;
    state = const AsyncValue.loading();
    final authRepository = ref.read(authRepositoryProvider);
    await _scheduleSessionOperation(generation, () async {
      final integrations = ref.read(authenticatedSessionIntegrationsProvider);
      var cleanupAttempts = 1;
      var cleanupResult = await _runLogoutCleanup(integrations);
      if (cleanupResult.failedSteps.isNotEmpty) {
        cleanupAttempts++;
        cleanupResult = await _runLogoutCleanup(
          integrations,
          retrySteps: cleanupResult.failedSteps,
          pushToken: cleanupResult.pushToken,
        );
      }
      if (!_isCurrentSession(generation)) return;

      final result = await authRepository.logout();
      if (!_isCurrentSession(generation)) return;
      result.fold(
        (failure) => LogService.e(
          'Failed to clear stored authentication during logout',
          failure,
        ),
        (_) {},
      );
      _activeSessionUser = null;
      _pendingTransitionCleanup = null;
      ref
          .read(authenticatedSessionBootstrapStatusProvider.notifier)
          .completeLogout(
            cleanupResult.failedSteps,
            cleanupAttempts: cleanupAttempts,
          );
      state = const AsyncValue.data(null);
    });
  }

  Future<AuthenticatedSessionCleanupResult> _runLogoutCleanup(
    AuthenticatedSessionIntegrations integrations, {
    Set<AuthenticatedSessionCleanupStep>? retrySteps,
    String? pushToken,
  }) async {
    try {
      return await integrations.cleanupForLogout(
        retrySteps: retrySteps,
        pushToken: pushToken,
      );
    } catch (error, stackTrace) {
      LogService.e(
        'Authenticated session cleanup failed during logout',
        error,
        stackTrace,
      );
      return AuthenticatedSessionCleanupResult(
        failedSteps:
            retrySteps ?? Set.of(AuthenticatedSessionCleanupStep.values),
        pushToken: pushToken,
      );
    }
  }

  Future<void> refreshUser() async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      final authRepository = ref.read(authRepositoryProvider);
      final result = await authRepository.getMe();
      return result.fold(
        (failure) => throw Exception(failure.message),
        (user) => user,
      );
    });
  }

  Future<void> retryAuthenticatedSessionBootstrap() async {
    final user = state.value;
    if (user == null) return;
    final generation = ++_sessionGeneration;
    await _scheduleAuthenticatedSessionBootstrap(
      user,
      generation: generation,
      publishUser: false,
    );
  }

  bool _isCurrentSession(int generation) {
    return generation == _sessionGeneration;
  }

  Future<void> _scheduleAuthenticatedSessionBootstrap(
    User user, {
    required int generation,
    required bool publishUser,
  }) {
    return _scheduleSessionOperation(
      generation,
      () => _performAuthenticatedSessionBootstrap(
        user,
        generation: generation,
        publishUser: publishUser,
      ),
    );
  }

  Future<void> _scheduleSessionOperation(
    int generation,
    Future<void> Function() operation,
  ) {
    final previous = _sessionOperationTail;
    final scheduled = () async {
      if (previous != null) {
        try {
          await previous;
        } catch (error, stackTrace) {
          LogService.e(
            'Previous authenticated-session operation failed',
            error,
            stackTrace,
          );
        }
      }
      if (!_isCurrentSession(generation)) return;
      await operation();
    }();

    late final Future<void> tracked;
    tracked = scheduled.whenComplete(() {
      if (identical(_sessionOperationTail, tracked)) {
        _sessionOperationTail = null;
      }
    });
    _sessionOperationTail = tracked;
    return tracked;
  }

  Future<void> _performAuthenticatedSessionBootstrap(
    User user, {
    required int generation,
    required bool publishUser,
  }) async {
    final integrations = ref.read(authenticatedSessionIntegrationsProvider);
    final failures = <AuthenticatedSessionBootstrapStep>{};
    final previousUser = _activeSessionUser;
    var cleanupAttempts = 0;
    var cleanupFailures = <AuthenticatedSessionCleanupStep>{};
    final pendingCleanup = _pendingTransitionCleanup;

    if (pendingCleanup != null) {
      cleanupAttempts++;
      try {
        final result = await integrations.resetForAccountTransition(
          pendingCleanup.previousUser,
          retrySteps: pendingCleanup.result.failedSteps,
          pushToken: pendingCleanup.result.pushToken,
        );
        cleanupFailures = result.failedSteps;
        _pendingTransitionCleanup = result.succeeded
            ? null
            : _PendingTransitionCleanup(
                previousUser: pendingCleanup.previousUser,
                result: result,
              );
      } catch (error, stackTrace) {
        cleanupFailures = Set.of(pendingCleanup.result.failedSteps);
        LogService.e('Account transition cleanup failed', error, stackTrace);
      }
      if (!_isCurrentSession(generation)) return;
    } else if (previousUser != null && previousUser.id != user.id) {
      cleanupAttempts++;
      try {
        final result = await integrations.resetForAccountTransition(
          previousUser,
        );
        cleanupFailures = result.failedSteps;
        if (!result.succeeded) {
          _pendingTransitionCleanup = _PendingTransitionCleanup(
            previousUser: previousUser,
            result: result,
          );
        }
      } catch (error, stackTrace) {
        final result = AuthenticatedSessionCleanupResult(
          failedSteps: Set.of(AuthenticatedSessionCleanupStep.values),
        );
        cleanupFailures = result.failedSteps;
        _pendingTransitionCleanup = _PendingTransitionCleanup(
          previousUser: previousUser,
          result: result,
        );
        LogService.e('Account transition cleanup failed', error, stackTrace);
      }
      if (!_isCurrentSession(generation)) return;
    }

    final statusNotifier = ref.read(
      authenticatedSessionBootstrapStatusProvider.notifier,
    );
    statusNotifier.start(user.id);

    await _runBootstrapStep(
      AuthenticatedSessionBootstrapStep.sessionProviders,
      failures,
      () => integrations.invalidateSessionProviders(user),
    );
    if (!_isCurrentSession(generation)) return;

    _activeSessionUser = user;
    if (publishUser) {
      state = AsyncValue.data(user);
    }

    await _runBootstrapStep(
      AuthenticatedSessionBootstrapStep.webSocket,
      failures,
      () => integrations.connectWebSocket(user),
    );
    if (!_isCurrentSession(generation)) return;

    final revenueCatPremium = await _runEntitlementStep(
      AuthenticatedSessionBootstrapStep.revenueCat,
      failures,
      () => integrations.synchronizeRevenueCat(user),
      unknownIsFailure: true,
    );
    if (!_isCurrentSession(generation)) return;
    final serverPremium = await _runEntitlementStep(
      AuthenticatedSessionBootstrapStep.serverEntitlement,
      failures,
      () async => integrations.refreshServerEntitlement(user),
    );
    if (!_isCurrentSession(generation)) return;

    await _runBootstrapStep(
      AuthenticatedSessionBootstrapStep.savedGenres,
      failures,
      () => integrations.synchronizeSavedGenres(user),
    );
    if (!_isCurrentSession(generation)) return;
    await _runBootstrapStep(
      AuthenticatedSessionBootstrapStep.pushRegistration,
      failures,
      () => integrations.registerPushNotifications(user),
    );
    if (!_isCurrentSession(generation)) return;

    ref
        .read(isPremiumProvider.notifier)
        .mergeEvidence(revenueCat: revenueCatPremium, server: serverPremium);

    final premium = ref.read(isPremiumProvider);
    try {
      await AnalyticsService.setUserProperty(
        name: 'plan',
        value: premium ? 'premium' : 'free',
      ).timeout(_authenticatedSessionIntegrationTimeout);
    } catch (error, stackTrace) {
      LogService.e(
        'Failed to update subscription analytics after session bootstrap',
        error,
        stackTrace,
      );
    }
    if (!_isCurrentSession(generation)) return;

    statusNotifier.complete(
      user.id,
      failures,
      failedCleanupSteps: cleanupFailures,
      cleanupAttempts: cleanupAttempts,
    );
  }

  Future<void> _runBootstrapStep(
    AuthenticatedSessionBootstrapStep step,
    Set<AuthenticatedSessionBootstrapStep> failures,
    Future<void> Function() operation,
  ) async {
    try {
      await operation();
    } catch (error, stackTrace) {
      failures.add(step);
      LogService.e(
        'Authenticated session ${step.name} bootstrap failed',
        error,
        stackTrace,
      );
    }
  }

  Future<bool?> _runEntitlementStep(
    AuthenticatedSessionBootstrapStep step,
    Set<AuthenticatedSessionBootstrapStep> failures,
    Future<bool?> Function() operation, {
    bool unknownIsFailure = false,
  }) async {
    try {
      final result = await operation();
      if (result == null && unknownIsFailure) {
        failures.add(step);
      }
      return result;
    } catch (error, stackTrace) {
      failures.add(step);
      LogService.e(
        'Authenticated session ${step.name} bootstrap failed',
        error,
        stackTrace,
      );
      return null;
    }
  }
}

/// Location permission state
enum LocationStatus { unknown, denied, deniedForever, granted, serviceDisabled }

/// Provider for current user location
@riverpod
Future<Position?> currentLocation(Ref ref) async {
  return LocationService.getCurrentPosition();
}

/// Provider for location permission status
@riverpod
Future<LocationStatus> locationStatus(Ref ref) async {
  final serviceEnabled = await LocationService.isLocationServiceEnabled();
  if (!serviceEnabled) {
    return LocationStatus.serviceDisabled;
  }

  final permission = await LocationService.checkPermission();
  switch (permission) {
    case LocationPermission.denied:
      return LocationStatus.denied;
    case LocationPermission.deniedForever:
      return LocationStatus.deniedForever;
    case LocationPermission.whileInUse:
    case LocationPermission.always:
      return LocationStatus.granted;
    default:
      return LocationStatus.unknown;
  }
}
