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
import '../../features/checkins/presentation/providers/checkin_providers.dart';
import '../../features/feed/presentation/providers/feed_providers.dart';
import '../../features/notifications/presentation/providers/notification_providers.dart';
import '../../features/subscription/presentation/subscription_service.dart';
import '../../features/subscription/presentation/subscription_providers.dart';
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
    Set<AuthenticatedSessionBootstrapStep> failedSteps,
  ) {
    state = AuthenticatedSessionBootstrapState.completed(
      userId: userId,
      attempt: state.attempt,
      failedSteps: failedSteps,
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
    _ref.invalidate(globalFeedProvider);
    _ref.invalidate(friendsFeedProvider);
    _ref.invalidate(happeningNowProvider);
    _ref.invalidate(unseenCountsProvider);
    _ref.invalidate(newCheckinCountProvider);
    _ref.invalidate(activeEventIdsProvider);
    _ref.invalidate(notificationFeedProvider);
    _ref.invalidate(unreadNotificationCountProvider);
    _ref.invalidate(nearbyEventsProvider);
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
    await service.connect(authToken: token, userId: user.id);
    if (!service.isConnected) {
      throw StateError('Authenticated WebSocket connection is unavailable');
    }
  }

  @override
  Future<bool?> synchronizeRevenueCat(User user) async {
    SubscriptionService.setCustomerInfoUpdateListener((customerInfo) {
      final isPremium = SubscriptionService.hasUnlimitedEntitlement(
        customerInfo,
      );
      _ref.read(isPremiumProvider.notifier).set(isPremium);
      _ref.invalidate(revenueCatCustomerInfoProvider);
      _ref.invalidate(serverSubscriptionStatusProvider);
    });

    final identified = await SubscriptionService.login(user.id);
    if (!identified) return null;

    final customerInfo = await SubscriptionService.getCustomerInfo();
    if (customerInfo == null) return null;
    return SubscriptionService.hasUnlimitedEntitlement(customerInfo);
  }

  @override
  Future<bool> refreshServerEntitlement(User user) async {
    _ref.invalidate(serverSubscriptionStatusProvider);
    final status = await _ref.read(serverSubscriptionStatusProvider.future);
    return status.isPremium;
  }

  @override
  Future<void> synchronizeSavedGenres(User user) async {
    await _ref
        .read(genrePersistenceProvider.notifier)
        .syncGenresToBackendIfNeeded();
  }

  @override
  Future<void> registerPushNotifications(User user) async {
    final service = _ref.read(pushNotificationServiceProvider);
    await service.initialize();
    if (!service.isInitialized) {
      throw StateError('Push notification registration is unavailable');
    }
  }

  @override
  Future<void> resetForAccountTransition(User previousUser) async {
    _ref.read(isPremiumProvider.notifier).set(false);
    _ref.invalidate(revenueCatCustomerInfoProvider);
    _ref.invalidate(serverSubscriptionStatusProvider);
    _ref.read(webSocketServiceProvider).disconnect(clearCredentials: true);
    await _ref.read(pushNotificationServiceProvider).resetForLogout();
    try {
      await SubscriptionService.logout();
    } finally {
      SubscriptionService.setCustomerInfoUpdateListener(null);
    }
  }

  @override
  Future<void> cleanupForLogout() async {
    final pushService = _ref.read(pushNotificationServiceProvider);
    final currentPushToken = pushService.currentToken;

    _ref.read(webSocketServiceProvider).disconnect(clearCredentials: true);

    if (currentPushToken != null) {
      try {
        final result = await _ref
            .read(feedRepositoryProvider)
            .unregisterDeviceToken(currentPushToken);
        result.fold(
          (failure) => LogService.w(
            'Failed to unregister push token during logout: '
            '${failure.message}',
          ),
          (_) {},
        );
      } catch (error, stackTrace) {
        LogService.e(
          'Failed to unregister push token during logout',
          error,
          stackTrace,
        );
      }
    }

    await pushService.resetForLogout();

    try {
      await SubscriptionService.logout();
    } catch (error, stackTrace) {
      LogService.e(
        'Failed to clear RevenueCat identity during logout',
        error,
        stackTrace,
      );
    }
    SubscriptionService.setCustomerInfoUpdateListener(null);
    _ref.read(isPremiumProvider.notifier).set(false);
    _ref.invalidate(revenueCatCustomerInfoProvider);
    _ref.invalidate(serverSubscriptionStatusProvider);

    _invalidateSessionProviders();

    try {
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
    } catch (error, stackTrace) {
      LogService.e(
        'Failed to clear session preferences during logout',
        error,
        stackTrace,
      );
    }

    Sentry.configureScope((scope) => scope.setUser(null));
    await AnalyticsService.clearUserId();
  }
}

@Riverpod(keepAlive: true)
class AuthState extends _$AuthState {
  User? _activeSessionUser;
  Future<void>? _bootstrapInFlight;

  @override
  Future<User?> build() async {
    final authRepository = ref.watch(authRepositoryProvider);
    final user = await authRepository.getCurrentUser();

    if (user != null) {
      await _bootstrapAuthenticatedSession(user);
    }

    return user;
  }

  Future<void> login(String email, String password) async {
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
      state = AsyncValue.data(authResponse.user);
      await _bootstrapAuthenticatedSession(authResponse.user);
    } catch (error, stackTrace) {
      state = AsyncValue.error(error, stackTrace);
    }
  }

  Future<void> register({
    required String email,
    required String password,
    required String username,
    String? firstName,
    String? lastName,
  }) async {
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
      state = AsyncValue.data(authResponse.user);
      await _bootstrapAuthenticatedSession(authResponse.user);
    } catch (error, stackTrace) {
      state = AsyncValue.error(error, stackTrace);
    }
  }

  Future<void> completeSocialSignIn(
    User user, {
    required SocialAuthenticationProvider provider,
  }) async {
    state = AsyncValue.data(user);
    await _bootstrapAuthenticatedSession(user);
  }

  Future<void> logout() async {
    final authRepository = ref.read(authRepositoryProvider);
    try {
      await ref
          .read(authenticatedSessionIntegrationsProvider)
          .cleanupForLogout();
    } catch (error, stackTrace) {
      LogService.e(
        'Authenticated session cleanup failed during logout',
        error,
        stackTrace,
      );
    }

    final result = await authRepository.logout();
    result.fold(
      (failure) => LogService.e(
        'Failed to clear stored authentication during logout',
        failure,
      ),
      (_) {},
    );
    _activeSessionUser = null;
    ref.read(authenticatedSessionBootstrapStatusProvider.notifier).reset();
    state = const AsyncValue.data(null);
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
    await _bootstrapAuthenticatedSession(user);
  }

  Future<void> _bootstrapAuthenticatedSession(User user) {
    final inFlight = _bootstrapInFlight;
    if (inFlight != null) return inFlight;

    final bootstrap = _performAuthenticatedSessionBootstrap(user);
    _bootstrapInFlight = bootstrap;
    return bootstrap.whenComplete(() {
      if (identical(_bootstrapInFlight, bootstrap)) {
        _bootstrapInFlight = null;
      }
    });
  }

  Future<void> _performAuthenticatedSessionBootstrap(User user) async {
    final integrations = ref.read(authenticatedSessionIntegrationsProvider);
    final failures = <AuthenticatedSessionBootstrapStep>{};
    final previousUser = _activeSessionUser;

    if (previousUser != null && previousUser.id != user.id) {
      try {
        await integrations.resetForAccountTransition(previousUser);
      } catch (error, stackTrace) {
        failures.add(AuthenticatedSessionBootstrapStep.sessionProviders);
        LogService.e('Account transition cleanup failed', error, stackTrace);
      }
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
    await _runBootstrapStep(
      AuthenticatedSessionBootstrapStep.webSocket,
      failures,
      () => integrations.connectWebSocket(user),
    );

    final revenueCatPremium = await _runEntitlementStep(
      AuthenticatedSessionBootstrapStep.revenueCat,
      failures,
      () => integrations.synchronizeRevenueCat(user),
      unknownIsFailure: true,
    );
    final serverPremium = await _runEntitlementStep(
      AuthenticatedSessionBootstrapStep.serverEntitlement,
      failures,
      () async => integrations.refreshServerEntitlement(user),
    );

    await _runBootstrapStep(
      AuthenticatedSessionBootstrapStep.savedGenres,
      failures,
      () => integrations.synchronizeSavedGenres(user),
    );
    await _runBootstrapStep(
      AuthenticatedSessionBootstrapStep.pushRegistration,
      failures,
      () => integrations.registerPushNotifications(user),
    );

    if (revenueCatPremium == true || serverPremium == true) {
      ref.read(isPremiumProvider.notifier).set(true);
    } else if (revenueCatPremium == false && serverPremium == false) {
      ref.read(isPremiumProvider.notifier).set(false);
    }

    final premium = ref.read(isPremiumProvider);
    try {
      await AnalyticsService.setUserProperty(
        name: 'plan',
        value: premium ? 'premium' : 'free',
      );
    } catch (error, stackTrace) {
      LogService.e(
        'Failed to update subscription analytics after session bootstrap',
        error,
        stackTrace,
      );
    }

    _activeSessionUser = user;
    statusNotifier.complete(user.id, failures);
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
