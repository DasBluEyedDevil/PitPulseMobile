import 'dart:async';
import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/services.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:purchases_flutter/purchases_flutter.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:web_socket_channel/web_socket_channel.dart';
import 'package:soundcheck_flutter/src/core/api/api_config.dart';
import 'package:soundcheck_flutter/src/core/api/dio_client.dart';
import 'package:soundcheck_flutter/src/core/providers/providers.dart';
import 'package:soundcheck_flutter/src/core/services/push_notification_service.dart';
import 'package:soundcheck_flutter/src/core/services/websocket_service.dart';
import 'package:soundcheck_flutter/src/features/auth/data/auth_repository.dart';
import 'package:soundcheck_flutter/src/features/auth/data/social_auth_service.dart';
import 'package:soundcheck_flutter/src/features/auth/domain/user.dart';
import 'package:soundcheck_flutter/src/features/feed/data/feed_repository.dart';
import 'package:soundcheck_flutter/src/features/subscription/presentation/subscription_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('production AuthState credential fencing', () {
    late _SecureStoragePlatformFake storagePlatform;

    setUp(() {
      SharedPreferences.setMockInitialValues({});
      storagePlatform = _SecureStoragePlatformFake();
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(
            _SecureStoragePlatformFake.channel,
            storagePlatform.handle,
          );
    });

    tearDown(() {
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(_SecureStoragePlatformFake.channel, null);
    });

    for (final scenario in [
      (
        name: 'password login',
        path: '${ApiConfig.auth}/login',
        start: (AuthState notifier) =>
            notifier.login('a@example.com', 'Password1!'),
      ),
      (
        name: 'registration',
        path: '${ApiConfig.auth}/register',
        start: (AuthState notifier) => notifier.register(
          email: 'a@example.com',
          password: 'Password1!',
          username: 'user-a',
        ),
      ),
    ]) {
      test(
        'logout prevents delayed ${scenario.name} from persisting credentials',
        () async {
          final response = Completer<ResponseBody>();
          final adapter = _RouteAdapter((options) {
            if (options.path == scenario.path) return response.future;
            throw StateError('Unexpected request: ${options.path}');
          });
          final harness = await _ProductionAuthHarness.create(adapter: adapter);
          addTearDown(harness.dispose);

          final authentication = scenario.start(harness.notifier);
          await adapter.requested.first;

          await harness.notifier.logout();
          response.complete(_authResponseBody(_userA, token: 'token-a'));
          await authentication;

          expect(storagePlatform.values, isEmpty);
          expect(harness.container.read(authStateProvider).value, isNull);
        },
      );
    }

    test('logout supersedes a stored-user read that completes later', () async {
      storagePlatform.values[ApiConfig.userKey] = jsonEncode(_userA.toJson());
      storagePlatform.values[ApiConfig.tokenKey] = 'token-a';
      final delayedRead = storagePlatform.delayNextRead(ApiConfig.userKey);
      final harness = _ProductionAuthHarness.createUninitialized(
        adapter: _RouteAdapter((options) {
          throw StateError('Unexpected request: ${options.path}');
        }),
      );
      addTearDown(harness.dispose);

      final restoration = harness.container.read(authStateProvider.future);
      await delayedRead.entered.future;
      final logout = harness.notifier.logout();

      delayedRead.release.complete();
      await Future.wait([restoration, logout]);

      expect(storagePlatform.values, isEmpty);
      expect(harness.container.read(authStateProvider).value, isNull);
    });

    for (final provider in ['google', 'apple']) {
      test(
        'logout prevents delayed real $provider social auth from persisting',
        () async {
          final backendEntered = Completer<void>();
          final response = Completer<ResponseBody>();
          final adapter = _RouteAdapter((options) {
            if (options.path == '/auth/social/state') {
              return _jsonResponseBody({
                'success': true,
                'data': {'state': 's' * 64},
              });
            }
            if (options.path == '/auth/social/$provider') {
              backendEntered.complete();
              return response.future;
            }
            throw StateError('Unexpected request: ${options.path}');
          });
          final harness = await _ProductionAuthHarness.create(adapter: adapter);
          addTearDown(harness.dispose);
          final platform = _SocialAuthPlatformFake();
          final service = SocialAuthService(
            dioClient: harness.dioClient,
            platform: platform,
          );

          final authentication = provider == 'google'
              ? harness.notifier.signInWithGoogle(service)
              : harness.notifier.signInWithApple(service);
          await backendEntered.future;

          await harness.notifier.logout();
          response.complete(_authResponseBody(_userA, token: 'token-a'));
          await authentication;

          expect(storagePlatform.values, isEmpty);
          expect(harness.container.read(authStateProvider).value, isNull);
        },
      );
    }

    test(
      'stale mid-write rollback finishes before newer credentials commit',
      () async {
        final adapter = _RouteAdapter((options) {
          if (options.path == '${ApiConfig.auth}/login') {
            final email = (options.data as Map<String, dynamic>)['email'];
            return _authResponseBody(
              email == _userA.email ? _userA : _userB,
              token: email == _userA.email ? 'token-a' : 'token-b',
            );
          }
          return _defaultIntegrationResponse(options);
        });
        final harness = await _ProductionAuthHarness.create(adapter: adapter);
        addTearDown(harness.dispose);
        final delayedWrite = storagePlatform.delayNextWrite(ApiConfig.tokenKey);

        final authenticationA = harness.notifier.login(
          _userA.email,
          'Password1!',
        );
        await delayedWrite.entered.future;
        final authenticationB = harness.notifier.login(
          _userB.email,
          'Password1!',
        );

        delayedWrite.release.complete();
        await Future.wait([authenticationA, authenticationB]);

        expect(storagePlatform.values[ApiConfig.tokenKey], 'token-b');
        expect(storagePlatform.values['refresh_token'], 'refresh-token-b');
        expect(
          jsonDecode(storagePlatform.values[ApiConfig.userKey]!)['id'],
          _userB.id,
        );
        expect(
          storagePlatform.operations,
          containsAllInOrder([
            'write:${ApiConfig.tokenKey}:token-a',
            'delete:${ApiConfig.tokenKey}',
            'delete:${ApiConfig.userKey}',
            'delete:refresh_token',
            'write:${ApiConfig.tokenKey}:token-b',
          ]),
        );
      },
    );

    test(
      'default integrations retry pending A and clean active B before C',
      () async {
        const pushA = 'push-token-a-1234567890';
        const pushB = 'push-token-b-1234567890';
        const pushC = 'push-token-c-1234567890';
        final lifecycleEvents = <String>[];
        var unregisterARequests = 0;
        final adapter = _RouteAdapter((options) {
          if (options.path == '${ApiConfig.auth}/login') {
            final email = (options.data as Map<String, dynamic>)['email'];
            final user = switch (email) {
              'a@example.com' => _userA,
              'b@example.com' => _userB,
              _ => _userC,
            };
            return _authResponseBody(user, token: 'token-${user.id}');
          }
          if (options.path == '/users/device-token') {
            final token = (options.data as Map<String, dynamic>)['token'];
            if (options.method == 'POST') {
              lifecycleEvents.add('register:$token');
              return _jsonResponseBody({'success': true, 'data': null});
            }
            lifecycleEvents.add('unregister:$token');
            if (token == pushA && unregisterARequests++ == 0) {
              return _jsonResponseBody({
                'success': false,
                'message': 'offline',
              }, statusCode: 503);
            }
            return _jsonResponseBody({'success': true, 'data': null});
          }
          return _defaultIntegrationResponse(options);
        });
        final harness = await _ProductionAuthHarness.create(
          adapter: adapter,
          pushTokens: [pushA, pushB, pushC],
        );
        addTearDown(harness.dispose);

        await harness.notifier.login(_userA.email, 'Password1!');
        await harness.notifier.login(_userB.email, 'Password1!');
        await harness.notifier.login(_userC.email, 'Password1!');

        expect(harness.container.read(authStateProvider).value, _userC);
        expect(
          lifecycleEvents,
          containsAllInOrder([
            'register:$pushA',
            'unregister:$pushA',
            'register:$pushB',
            'unregister:$pushA',
            'unregister:$pushB',
            'register:$pushC',
          ]),
        );
      },
    );
  });
}

class _ProductionAuthHarness {
  _ProductionAuthHarness._({
    required this.container,
    required this.dioClient,
    required this.webSocket,
    required this.pushNotifications,
  });

  final ProviderContainer container;
  final DioClient dioClient;
  final WebSocketService webSocket;
  final PushNotificationService pushNotifications;

  AuthState get notifier => container.read(authStateProvider.notifier);

  static Future<_ProductionAuthHarness> create({
    required HttpClientAdapter adapter,
    List<String?> pushTokens = const [],
  }) async {
    final harness = createUninitialized(
      adapter: adapter,
      pushTokens: pushTokens,
    );
    await harness.container.read(authStateProvider.future);
    return harness;
  }

  static _ProductionAuthHarness createUninitialized({
    required HttpClientAdapter adapter,
    List<String?> pushTokens = const [],
  }) {
    const storage = FlutterSecureStorage();
    final dio = Dio(BaseOptions(baseUrl: ApiConfig.baseUrl))
      ..httpClientAdapter = adapter;
    final dioClient = DioClient(secureStorage: storage, dio: dio);
    final repository = AuthRepository(
      dioClient: dioClient,
      secureStorage: storage,
    );
    final webSocket = WebSocketService(
      channelFactory: (_, {authToken}) => _FakeWebSocketChannel(),
    );
    final feedRepository = FeedRepository(dioClient: dioClient);
    final pushNotifications = PushNotificationService(
      feedRepository: feedRepository,
      messagingClient: _PushMessagingClient(pushTokens),
      localNotificationsInitializer: () async {},
    );
    final container = ProviderContainer(
      overrides: [
        dioClientProvider.overrideWithValue(dioClient),
        authRepositoryProvider.overrideWithValue(repository),
        webSocketServiceProvider.overrideWithValue(webSocket),
        pushNotificationServiceProvider.overrideWithValue(pushNotifications),
        revenueCatSdkAdapterProvider.overrideWithValue(
          _RevenueCatSdkAdapterFake(),
        ),
      ],
    );
    return _ProductionAuthHarness._(
      container: container,
      dioClient: dioClient,
      webSocket: webSocket,
      pushNotifications: pushNotifications,
    );
  }

  Future<void> dispose() async {
    container.dispose();
    webSocket.dispose();
    await pushNotifications.dispose();
  }
}

class _RevenueCatSdkAdapterFake extends RevenueCatSdkAdapter {
  CustomerInfoUpdateListener? listener;

  @override
  Future<bool> login(String userId) async => true;

  @override
  Future<CustomerInfo?> getCustomerInfo() async {
    return _inactiveCustomerInfo();
  }

  @override
  Future<void> logout() async {}

  @override
  void setCustomerInfoUpdateListener(CustomerInfoUpdateListener? value) {
    listener = value;
  }
}

class _PushMessagingClient implements PushMessagingClient {
  _PushMessagingClient(List<String?> tokens) : _tokens = [...tokens];

  final List<String?> _tokens;

  @override
  Future<bool> ensureInitialized() async => true;

  @override
  Future<RemoteMessage?> getInitialMessage() async => null;

  @override
  Future<String?> getToken() async {
    return _tokens.isEmpty ? null : _tokens.removeAt(0);
  }

  @override
  Stream<RemoteMessage> get onMessage => const Stream.empty();

  @override
  Stream<RemoteMessage> get onMessageOpenedApp => const Stream.empty();

  @override
  Stream<String> get onTokenRefresh => const Stream.empty();

  @override
  void registerBackgroundHandler() {}

  @override
  Future<AuthorizationStatus> requestPermission() async {
    return AuthorizationStatus.authorized;
  }
}

class _FakeWebSocketChannel implements WebSocketChannel {
  final _incoming = StreamController<dynamic>();
  final _sink = _FakeWebSocketSink();

  @override
  int? get closeCode => null;

  @override
  String? get closeReason => null;

  @override
  String? get protocol => null;

  @override
  Future<void> get ready async {}

  @override
  WebSocketSink get sink => _sink;

  @override
  Stream get stream => _incoming.stream;

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class _FakeWebSocketSink implements WebSocketSink {
  final _done = Completer<void>();

  @override
  Future get done => _done.future;

  @override
  void add(Object? data) {}

  @override
  void addError(Object error, [StackTrace? stackTrace]) {}

  @override
  Future<void> addStream(Stream stream) async {}

  @override
  Future<void> close([int? closeCode, String? closeReason]) async {
    if (!_done.isCompleted) _done.complete();
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class _SocialAuthPlatformFake implements SocialAuthPlatform {
  @override
  Future<String?> signInWithGoogle() async => 'google-id-token';

  @override
  Future<AppleSocialCredential> signInWithApple() async {
    return const AppleSocialCredential(
      identityToken: 'apple-identity-token',
      givenName: 'User',
      familyName: 'A',
    );
  }

  @override
  Future<void> signOutGoogle() async {}
}

class _RouteAdapter implements HttpClientAdapter {
  _RouteAdapter(this._handler);

  final FutureOr<ResponseBody> Function(RequestOptions options) _handler;
  final _requested = StreamController<RequestOptions>.broadcast();

  Stream<RequestOptions> get requested => _requested.stream;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    _requested.add(options);
    return _handler(options);
  }

  @override
  void close({bool force = false}) {
    _requested.close();
  }
}

class _SecureStoragePlatformFake {
  static const channel = MethodChannel(
    'plugins.it_nomads.com/flutter_secure_storage',
  );

  final values = <String, String>{};
  final operations = <String>[];
  final _delayedReads = <String, _StorageDelay>{};
  final _delayedWrites = <String, _StorageDelay>{};

  _StorageDelay delayNextRead(String key) {
    final delay = _StorageDelay();
    _delayedReads[key] = delay;
    return delay;
  }

  _StorageDelay delayNextWrite(String key) {
    final delay = _StorageDelay();
    _delayedWrites[key] = delay;
    return delay;
  }

  Future<Object?> handle(MethodCall call) async {
    final arguments = (call.arguments as Map).cast<String, Object?>();
    final key = arguments['key'] as String?;
    switch (call.method) {
      case 'read':
        final value = values[key];
        final delay = _delayedReads.remove(key);
        if (delay != null) {
          delay.entered.complete();
          await delay.release.future;
        }
        return value;
      case 'write':
        final value = arguments['value']! as String;
        final delay = _delayedWrites.remove(key);
        if (delay != null) {
          delay.entered.complete();
          await delay.release.future;
        }
        values[key!] = value;
        operations.add('write:$key:$value');
        return null;
      case 'delete':
        values.remove(key);
        operations.add('delete:$key');
        return null;
      case 'deleteAll':
        values.clear();
        operations.add('deleteAll');
        return null;
      case 'readAll':
        return Map<String, String>.from(values);
      case 'containsKey':
        return values.containsKey(key);
      default:
        throw MissingPluginException('Unsupported secure-storage call');
    }
  }
}

class _StorageDelay {
  final entered = Completer<void>();
  final release = Completer<void>();
}

ResponseBody _authResponseBody(User user, {required String token}) {
  return _jsonResponseBody({
    'success': true,
    'data': {
      'user': user.toJson(),
      'token': token,
      'refreshToken': 'refresh-$token',
    },
  });
}

ResponseBody _jsonResponseBody(
  Map<String, Object?> body, {
  int statusCode = 200,
}) {
  return ResponseBody.fromString(
    jsonEncode(body),
    statusCode,
    headers: {
      Headers.contentTypeHeader: [Headers.jsonContentType],
    },
  );
}

ResponseBody _defaultIntegrationResponse(RequestOptions options) {
  if (options.path == '/subscription/status') {
    return _jsonResponseBody({
      'success': true,
      'data': {'isPremium': false},
    });
  }
  throw StateError('Unexpected request: ${options.method} ${options.path}');
}

CustomerInfo _inactiveCustomerInfo() {
  const identifier = SubscriptionService.entitlementIdentifier;
  const entitlement = EntitlementInfo(
    identifier,
    false,
    true,
    '2026-07-26T00:00:00Z',
    '2026-07-26T00:00:00Z',
    SubscriptionService.productMonthly,
    true,
  );
  return const CustomerInfo(
    EntitlementInfos({identifier: entitlement}, {}),
    {},
    [],
    [],
    [],
    '2026-07-26T00:00:00Z',
    'test-user',
    {},
    '2026-07-26T00:00:00Z',
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

const _userC = User(
  id: 'user-c',
  email: 'c@example.com',
  username: 'user-c',
  isVerified: true,
  isActive: true,
  createdAt: '2026-07-26T00:00:00.000Z',
  updatedAt: '2026-07-26T00:00:00.000Z',
);
