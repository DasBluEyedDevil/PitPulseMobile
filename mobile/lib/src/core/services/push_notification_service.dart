import 'dart:async';
import 'dart:convert';
import 'dart:io' show Platform;

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

import '../../../firebase_options.dart';
import '../../features/feed/data/feed_repository.dart';
import 'log_service.dart';

/// Top-level background handler (must be top-level function, not a method)
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
  LogService.i('Background message received: ${message.messageId}');
}

/// Service for managing push notifications via Firebase Cloud Messaging
/// and displaying foreground notifications via flutter_local_notifications
class PushNotificationService {
  final FeedRepository? _feedRepository;
  final FlutterLocalNotificationsPlugin _localNotifications =
      FlutterLocalNotificationsPlugin();

  String? _currentToken;
  bool _initialized = false;
  bool _initialMessageHandled = false;
  int _sessionGeneration = 0;
  Future<void>? _initializationFuture;
  StreamSubscription<String>? _tokenRefreshSubscription;
  StreamSubscription<RemoteMessage>? _onMessageSubscription;
  StreamSubscription<RemoteMessage>? _onMessageOpenedAppSubscription;
  final _notificationTapController = StreamController<String>.broadcast();

  /// Whether push notifications have been initialized
  bool get isInitialized => _initialized;

  /// Current FCM device token
  String? get currentToken => _currentToken;

  /// Stream of notification IDs when tapped
  Stream<String> get onNotificationTap => _notificationTapController.stream;

  PushNotificationService({FeedRepository? feedRepository})
    : _feedRepository = feedRepository;

  /// Initialize push notification service
  /// Requests permission, gets FCM token, sets up handlers
  Future<void> initialize() async {
    if (_initialized) return;
    final inFlight = _initializationFuture;
    if (inFlight != null) return inFlight;

    final future = _initialize();
    _initializationFuture = future;
    try {
      await future;
    } finally {
      _initializationFuture = null;
    }
  }

  Future<void> _initialize() async {
    final generation = _sessionGeneration;
    try {
      // Set background message handler
      FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);

      // Request notification permission
      final settings = await FirebaseMessaging.instance.requestPermission(
        alert: true,
        badge: true,
        sound: true,
        provisional: false,
      );

      if (settings.authorizationStatus == AuthorizationStatus.denied) {
        LogService.w('Push notification permission denied');
        return;
      }

      LogService.i(
        'Push notification permission: ${settings.authorizationStatus}',
      );

      // Initialize local notifications for foreground display
      await _initializeLocalNotifications();
      if (generation != _sessionGeneration) return;

      // Get FCM token
      final token = await FirebaseMessaging.instance.getToken();
      if (generation != _sessionGeneration) return;
      if (token != null) {
        _currentToken = token;
        await _sendTokenToBackend(token);
        LogService.i('FCM token obtained: ${token.substring(0, 20)}...');
      }

      // Listen for token refresh
      await _tokenRefreshSubscription?.cancel();
      if (generation != _sessionGeneration) return;
      _tokenRefreshSubscription = FirebaseMessaging.instance.onTokenRefresh
          .listen((newToken) async {
            _currentToken = newToken;
            await _sendTokenToBackend(newToken);
            LogService.i('FCM token refreshed');
          });

      // Handle foreground messages -- show local notification
      await _onMessageSubscription?.cancel();
      if (generation != _sessionGeneration) return;
      _onMessageSubscription = FirebaseMessaging.onMessage.listen(
        _showLocalNotification,
      );

      // Handle notification tap when app is in background
      await _onMessageOpenedAppSubscription?.cancel();
      if (generation != _sessionGeneration) return;
      _onMessageOpenedAppSubscription = FirebaseMessaging.onMessageOpenedApp
          .listen(_handleNotificationTap);

      // Handle notification tap when app was terminated
      if (!_initialMessageHandled) {
        _initialMessageHandled = true;
        final initialMessage = await FirebaseMessaging.instance
            .getInitialMessage();
        if (generation != _sessionGeneration) {
          await _cancelSessionSubscriptions();
          return;
        }
        if (initialMessage != null) {
          _handleNotificationTap(initialMessage);
        }
      }

      _initialized = true;
    } catch (e, stack) {
      LogService.e('Failed to initialize push notifications', e, stack);
    }
  }

  /// Initialize flutter_local_notifications plugin
  Future<void> _initializeLocalNotifications() async {
    const androidSettings = AndroidInitializationSettings(
      '@mipmap/ic_launcher',
    );
    const iosSettings = DarwinInitializationSettings(
      requestAlertPermission: false,
      requestBadgePermission: false,
      requestSoundPermission: false,
    );

    const initSettings = InitializationSettings(
      android: androidSettings,
      iOS: iosSettings,
    );

    await _localNotifications.initialize(
      settings: initSettings,
      onDidReceiveNotificationResponse: (response) {
        LogService.d('Local notification tapped: ${response.payload}');
        _handleLocalNotificationTap(response.payload);
      },
    );

    // Create Android notification channel
    const androidChannel = AndroidNotificationChannel(
      'soundcheck_feed',
      'Feed Updates',
      description: 'Notifications for friend check-ins and activity',
      importance: Importance.high,
    );

    await _localNotifications
        .resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin
        >()
        ?.createNotificationChannel(androidChannel);
  }

  /// Show local notification when a message arrives in foreground
  Future<void> _showLocalNotification(RemoteMessage message) async {
    final notification = message.notification;
    if (notification == null) return;

    const androidDetails = AndroidNotificationDetails(
      'soundcheck_feed',
      'Feed Updates',
      channelDescription: 'Notifications for friend check-ins and activity',
      importance: Importance.high,
      priority: Priority.high,
      showWhen: true,
    );

    const iosDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
    );

    const details = NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
    );

    await _localNotifications.show(
      id: notification.hashCode,
      title: notification.title,
      body: notification.body,
      notificationDetails: details,
      payload: _buildRoutePayload(message.data),
    );
  }

  /// Handle notification tap to navigate to relevant screen
  void _handleNotificationTap(RemoteMessage message) {
    LogService.d('Notification tapped: ${message.data}');

    // Parse deep link from notification data
    final deepLink = parseDeepLink(message.data);
    if (deepLink != null) {
      _notificationTapController.add(deepLink);
    }
  }

  void _handleLocalNotificationTap(String? payload) {
    if (payload == null || payload.isEmpty) return;

    String? deepLink;
    try {
      final decoded = jsonDecode(payload);
      if (decoded is Map<String, dynamic>) {
        deepLink = parseDeepLink(decoded);
      } else if (decoded is String) {
        deepLink = _sanitizeInternalRoute(decoded);
      }
    } catch (_) {
      deepLink = _sanitizeInternalRoute(payload);
    }

    if (deepLink != null) {
      _notificationTapController.add(deepLink);
    }
  }

  /// Parse deep link from notification payload
  @visibleForTesting
  String? parseDeepLink(Map<String, dynamic> data) {
    // Check for explicit deep link
    if (data['deepLink'] != null) {
      return _sanitizeInternalRoute(data['deepLink'].toString());
    }

    // Check for notification ID (to show notification detail)
    if (data['notificationId'] != null) {
      return _sanitizeInternalRoute('/notifications/${data['notificationId']}');
    }

    // Check for check-in ID
    if (data['checkinId'] != null) {
      return _sanitizeInternalRoute('/checkins/${data['checkinId']}');
    }

    // Check for band ID
    if (data['bandId'] != null) {
      return _sanitizeInternalRoute('/bands/${data['bandId']}');
    }

    // Check for venue ID
    if (data['venueId'] != null) {
      return _sanitizeInternalRoute('/venues/${data['venueId']}');
    }

    // Check for user ID (profile)
    if (data['userId'] != null) {
      return _sanitizeInternalRoute('/users/${data['userId']}');
    }

    // Check for event/show ID
    if (data['eventId'] != null) {
      return _sanitizeInternalRoute('/events/${data['eventId']}');
    }
    if (data['showId'] != null) {
      return _sanitizeInternalRoute('/events/${data['showId']}');
    }

    return null;
  }

  String? _buildRoutePayload(Map<String, dynamic> data) {
    final deepLink = parseDeepLink(data);
    if (deepLink == null) return null;
    return jsonEncode({'deepLink': deepLink});
  }

  String? _sanitizeInternalRoute(String route) {
    final trimmed = route.trim();
    final uri = Uri.tryParse(trimmed);
    if (trimmed.isEmpty || uri == null || uri.hasScheme || uri.hasAuthority) {
      LogService.w('Rejected external push deep link: $route');
      return null;
    }

    if (!trimmed.startsWith('/') || trimmed.startsWith('//')) {
      LogService.w('Rejected malformed push deep link: $route');
      return null;
    }

    const allowedExactRoutes = {
      '/badges',
      '/checkin',
      '/discover',
      '/discover/users',
      '/feed',
      '/notifications',
      '/profile',
      '/pro',
      '/search',
    };
    const allowedPrefixes = {
      '/bands/',
      '/checkins/',
      '/events/',
      '/notifications/',
      '/users/',
      '/venues/',
      '/wrapped/',
    };

    final path = uri.path;
    final isAllowed =
        allowedExactRoutes.contains(path) ||
        allowedPrefixes.any(path.startsWith);
    if (!isAllowed) {
      LogService.w('Rejected unknown push deep link: $route');
      return null;
    }

    return uri.toString();
  }

  /// Send FCM token to backend for push notification targeting
  Future<void> _sendTokenToBackend(String token) async {
    try {
      final platform = Platform.isIOS ? 'ios' : 'android';
      await _feedRepository?.registerDeviceToken(token, platform);
    } catch (e) {
      LogService.e('Failed to send FCM token to backend', e);
      // Non-fatal: token registration failure shouldn't block app usage
    }
  }

  /// Cancel session-scoped Firebase subscriptions while preserving tap stream
  /// listeners owned by app/router lifecycle.
  Future<void> resetForLogout() async {
    _sessionGeneration++;
    await _cancelSessionSubscriptions();
    _currentToken = null;
    _initialized = false;
    _initializationFuture = null;
  }

  Future<void> disposeSession() => resetForLogout();

  Future<void> dispose() async {
    await resetForLogout();
    await _notificationTapController.close();
  }

  Future<void> _cancelSessionSubscriptions() async {
    await _tokenRefreshSubscription?.cancel();
    await _onMessageSubscription?.cancel();
    await _onMessageOpenedAppSubscription?.cancel();
    _tokenRefreshSubscription = null;
    _onMessageSubscription = null;
    _onMessageOpenedAppSubscription = null;
  }
}
