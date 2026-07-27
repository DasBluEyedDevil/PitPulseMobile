import 'package:dartz/dartz.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:soundcheck_flutter/src/core/api/dio_client.dart';
import 'package:soundcheck_flutter/src/core/error/failures.dart';
import 'package:soundcheck_flutter/src/core/providers/providers.dart';
import 'package:soundcheck_flutter/src/core/session/authenticated_session.dart';
import 'package:soundcheck_flutter/src/features/auth/data/auth_repository.dart';
import 'package:soundcheck_flutter/src/features/auth/domain/user.dart';
import 'package:soundcheck_flutter/src/features/subscription/presentation/subscription_providers.dart';

void main() {
  group('AuthState authenticated-session bootstrap', () {
    test('password login runs every bootstrap step exactly once', () async {
      final harness = await _AuthHarness.create();
      addTearDown(harness.dispose);
      harness.repository.loginResponses.add(_authResponse(_userA));

      await harness.notifier.login('a@example.com', 'Password1!');

      expect(harness.container.read(authStateProvider).value, _userA);
      harness.expectSingleBootstrapFor(_userA);
    });

    test('registration runs every bootstrap step exactly once', () async {
      final harness = await _AuthHarness.create();
      addTearDown(harness.dispose);
      harness.repository.registerResponses.add(_authResponse(_userA));

      await harness.notifier.register(
        email: 'a@example.com',
        password: 'Password1!',
        username: 'user-a',
      );

      expect(harness.container.read(authStateProvider).value, _userA);
      harness.expectSingleBootstrapFor(_userA);
    });

    for (final provider in SocialAuthenticationProvider.values) {
      test(
        '${provider.name} login runs every bootstrap step exactly once',
        () async {
          final harness = await _AuthHarness.create();
          addTearDown(harness.dispose);

          await harness.notifier.completeSocialSignIn(
            _userA,
            provider: provider,
          );

          expect(harness.container.read(authStateProvider).value, _userA);
          harness.expectSingleBootstrapFor(_userA);
        },
      );
    }

    test(
      'stored-user restoration runs every bootstrap step exactly once',
      () async {
        final harness = await _AuthHarness.create(restoredUser: _userA);
        addTearDown(harness.dispose);

        expect(harness.container.read(authStateProvider).value, _userA);
        harness.expectSingleBootstrapFor(_userA);
      },
    );

    test(
      'back-to-back users replace the prior session and bootstrap B once',
      () async {
        final harness = await _AuthHarness.create();
        addTearDown(harness.dispose);
        harness.repository.loginResponses.addAll([
          _authResponse(_userA),
          _authResponse(_userB),
        ]);

        await harness.notifier.login('a@example.com', 'Password1!');
        await harness.notifier.login('b@example.com', 'Password1!');

        expect(harness.container.read(authStateProvider).value, _userB);
        expect(harness.integrations.accountTransitionResetUsers, [_userA.id]);
        expect(harness.integrations.bootstrapCalls, [
          ..._expectedBootstrapCalls(_userA),
          ..._expectedBootstrapCalls(_userB),
        ]);
        expect(
          harness.container.read(authenticatedSessionBootstrapStatusProvider),
          isA<AuthenticatedSessionBootstrapState>()
              .having((status) => status.userId, 'userId', _userB.id)
              .having((status) => status.attempt, 'attempt', 1)
              .having((status) => status.isDegraded, 'isDegraded', isFalse),
        );
      },
    );

    test('logout cleans up without bootstrapping another session', () async {
      final harness = await _AuthHarness.create();
      addTearDown(harness.dispose);
      harness.repository.loginResponses.add(_authResponse(_userA));
      await harness.notifier.login('a@example.com', 'Password1!');
      final callsBeforeLogout = [...harness.integrations.bootstrapCalls];

      await harness.notifier.logout();

      expect(harness.container.read(authStateProvider).value, isNull);
      expect(harness.integrations.logoutCleanupCalls, 1);
      expect(harness.integrations.bootstrapCalls, callsBeforeLogout);
      expect(harness.repository.logoutCalls, 1);
      expect(
        harness.container.read(authenticatedSessionBootstrapStatusProvider),
        const AuthenticatedSessionBootstrapState.idle(),
      );
    });

    test('ordinary profile refresh does not bootstrap again', () async {
      final harness = await _AuthHarness.create();
      addTearDown(harness.dispose);
      harness.repository.loginResponses.add(_authResponse(_userA));
      harness.repository.meResponses.add(_userA.copyWith(firstName: 'Updated'));
      await harness.notifier.login('a@example.com', 'Password1!');
      final callsBeforeRefresh = [...harness.integrations.bootstrapCalls];

      await harness.notifier.refreshUser();

      expect(harness.integrations.bootstrapCalls, callsBeforeRefresh);
      expect(
        harness.container.read(authStateProvider).value?.firstName,
        'Updated',
      );
    });

    test(
      'integration failures preserve auth and known premium until retry',
      () async {
        final previousDebugPrint = debugPrint;
        debugPrint = (message, {wrapWidth}) {};
        addTearDown(() => debugPrint = previousDebugPrint);
        final harness = await _AuthHarness.create();
        addTearDown(harness.dispose);
        harness.repository.loginResponses.add(_authResponse(_userA));
        harness.container.read(isPremiumProvider.notifier).set(true);
        harness.integrations
          ..revenueCatPremium = null
          ..failedSteps.addAll({
            AuthenticatedSessionBootstrapStep.sessionProviders,
            AuthenticatedSessionBootstrapStep.webSocket,
            AuthenticatedSessionBootstrapStep.serverEntitlement,
            AuthenticatedSessionBootstrapStep.savedGenres,
            AuthenticatedSessionBootstrapStep.pushRegistration,
          });

        await harness.notifier.login('a@example.com', 'Password1!');

        expect(harness.container.read(authStateProvider).value, _userA);
        expect(harness.premiumSubscription.read(), isTrue);
        expect(
          harness.container.read(authenticatedSessionBootstrapStatusProvider),
          isA<AuthenticatedSessionBootstrapState>()
              .having((status) => status.userId, 'userId', _userA.id)
              .having((status) => status.attempt, 'attempt', 1)
              .having((status) => status.canRetry, 'canRetry', isTrue)
              .having(
                (status) => status.failedSteps,
                'failedSteps',
                unorderedEquals(AuthenticatedSessionBootstrapStep.values),
              ),
        );

        harness.integrations
          ..failedSteps.clear()
          ..revenueCatPremium = true
          ..serverPremium = true;
        await harness.notifier.retryAuthenticatedSessionBootstrap();

        expect(harness.container.read(authStateProvider).value, _userA);
        expect(harness.premiumSubscription.read(), isTrue);
        expect(harness.integrations.bootstrapCalls, [
          ..._expectedBootstrapCalls(_userA),
          ..._expectedBootstrapCalls(_userA),
        ]);
        expect(
          harness.container.read(authenticatedSessionBootstrapStatusProvider),
          isA<AuthenticatedSessionBootstrapState>()
              .having((status) => status.attempt, 'attempt', 2)
              .having((status) => status.failedSteps, 'failedSteps', isEmpty)
              .having((status) => status.canRetry, 'canRetry', isFalse),
        );
      },
    );
  });
}

class _AuthHarness {
  _AuthHarness._({
    required this.container,
    required this.repository,
    required this.integrations,
    required this.premiumSubscription,
  });

  final ProviderContainer container;
  final _FakeAuthRepository repository;
  final _RecordingSessionIntegrations integrations;
  final ProviderSubscription<bool> premiumSubscription;

  AuthState get notifier => container.read(authStateProvider.notifier);

  static Future<_AuthHarness> create({User? restoredUser}) async {
    final repository = _FakeAuthRepository()..restoredUser = restoredUser;
    final integrations = _RecordingSessionIntegrations();
    final container = ProviderContainer(
      overrides: [
        authRepositoryProvider.overrideWithValue(repository),
        authenticatedSessionIntegrationsProvider.overrideWithValue(
          integrations,
        ),
      ],
    );
    final premiumSubscription = container.listen(
      isPremiumProvider,
      (_, _) {},
      fireImmediately: true,
    );

    await container.read(authStateProvider.future);
    return _AuthHarness._(
      container: container,
      repository: repository,
      integrations: integrations,
      premiumSubscription: premiumSubscription,
    );
  }

  void expectSingleBootstrapFor(User user) {
    expect(integrations.bootstrapCalls, _expectedBootstrapCalls(user));
    expect(
      container.read(authenticatedSessionBootstrapStatusProvider),
      isA<AuthenticatedSessionBootstrapState>()
          .having((status) => status.userId, 'userId', user.id)
          .having((status) => status.attempt, 'attempt', 1)
          .having((status) => status.isRunning, 'isRunning', isFalse)
          .having((status) => status.failedSteps, 'failedSteps', isEmpty),
    );
  }

  void dispose() {
    premiumSubscription.close();
    container.dispose();
  }
}

class _FakeAuthRepository extends AuthRepository {
  _FakeAuthRepository()
    : super(
        dioClient: DioClient(secureStorage: const FlutterSecureStorage()),
        secureStorage: const FlutterSecureStorage(),
      );

  User? restoredUser;
  final loginResponses = <AuthResponse>[];
  final registerResponses = <AuthResponse>[];
  final meResponses = <User>[];
  int logoutCalls = 0;

  @override
  Future<User?> getCurrentUser() async => restoredUser;

  @override
  Future<Either<Failure, AuthResponse>> login(LoginRequest request) async {
    return Right(loginResponses.removeAt(0));
  }

  @override
  Future<Either<Failure, AuthResponse>> register(
    RegisterRequest request,
  ) async {
    return Right(registerResponses.removeAt(0));
  }

  @override
  Future<Either<Failure, User>> getMe() async {
    return Right(meResponses.removeAt(0));
  }

  @override
  Future<Either<Failure, void>> logout() async {
    logoutCalls++;
    return const Right(null);
  }
}

class _RecordingSessionIntegrations
    implements AuthenticatedSessionIntegrations {
  final bootstrapCalls = <String>[];
  final accountTransitionResetUsers = <String>[];
  final failedSteps = <AuthenticatedSessionBootstrapStep>{};
  bool? revenueCatPremium = false;
  bool serverPremium = false;
  int logoutCleanupCalls = 0;

  Future<void> _record(
    AuthenticatedSessionBootstrapStep step,
    User user,
  ) async {
    bootstrapCalls.add('${step.name}:${user.id}');
    if (failedSteps.contains(step)) {
      throw StateError('${step.name} unavailable');
    }
  }

  @override
  Future<void> invalidateSessionProviders(User user) {
    return _record(AuthenticatedSessionBootstrapStep.sessionProviders, user);
  }

  @override
  Future<void> connectWebSocket(User user) {
    return _record(AuthenticatedSessionBootstrapStep.webSocket, user);
  }

  @override
  Future<bool?> synchronizeRevenueCat(User user) async {
    await _record(AuthenticatedSessionBootstrapStep.revenueCat, user);
    return revenueCatPremium;
  }

  @override
  Future<bool> refreshServerEntitlement(User user) async {
    await _record(AuthenticatedSessionBootstrapStep.serverEntitlement, user);
    return serverPremium;
  }

  @override
  Future<void> synchronizeSavedGenres(User user) {
    return _record(AuthenticatedSessionBootstrapStep.savedGenres, user);
  }

  @override
  Future<void> registerPushNotifications(User user) {
    return _record(AuthenticatedSessionBootstrapStep.pushRegistration, user);
  }

  @override
  Future<void> resetForAccountTransition(User previousUser) async {
    accountTransitionResetUsers.add(previousUser.id);
  }

  @override
  Future<void> cleanupForLogout() async {
    logoutCleanupCalls++;
  }
}

List<String> _expectedBootstrapCalls(User user) {
  return AuthenticatedSessionBootstrapStep.values
      .map((step) => '${step.name}:${user.id}')
      .toList();
}

AuthResponse _authResponse(User user) {
  return AuthResponse(
    user: user,
    token: 'token-${user.id}',
    refreshToken: 'refresh-${user.id}',
  );
}

const _userA = User(
  id: 'user-a',
  email: 'a@example.com',
  username: 'user-a',
  isVerified: true,
  isActive: true,
  createdAt: '2026-07-26T00:00:00.000Z',
  updatedAt: '2026-07-26T00:00:00.000Z',
);

const _userB = User(
  id: 'user-b',
  email: 'b@example.com',
  username: 'user-b',
  isVerified: true,
  isActive: true,
  createdAt: '2026-07-26T00:00:00.000Z',
  updatedAt: '2026-07-26T00:00:00.000Z',
);
