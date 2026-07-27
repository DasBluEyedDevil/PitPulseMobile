import 'dart:async';
import 'dart:convert';

import 'package:web_socket_channel/io.dart';
import 'package:web_socket_channel/web_socket_channel.dart';
import 'package:web_socket_channel/status.dart' as status;

import '../api/api_config.dart';
import 'log_service.dart';

typedef WebSocketChannelFactory =
    WebSocketChannel Function(Uri uri, {String? authToken});
typedef WebSocketUriBuilder = Uri Function(String? authToken);

/// WebSocket event types matching backend
class WebSocketEvents {
  static const String connected = 'connected';
  static const String authenticated = 'authenticated';
  static const String disconnected = 'disconnected';
  static const String joinedRoom = 'joined_room';
  static const String leftRoom = 'left_room';
  static const String newCheckin = 'new_checkin';
  static const String newFollower = 'new_follower';
  static const String newComment = 'new_comment';
  static const String newToast = 'new_toast';
  static const String toastRemoved = 'toast_removed';
  static const String commentDeleted = 'comment_deleted';
  static const String userTyping = 'user_typing';
  static const String userStoppedTyping = 'user_stopped_typing';
  static const String userOnline = 'user_online';
  static const String userOffline = 'user_offline';
  static const String badgeEarned = 'badge_earned';
  static const String sameEventCheckin = 'same_event_checkin';
  static const String error = 'error';
  static const String pong = 'pong';
}

/// WebSocket message model
class WebSocketMessage {
  final String type;
  final Map<String, dynamic> payload;

  WebSocketMessage({required this.type, required this.payload});

  factory WebSocketMessage.fromJson(Map<String, dynamic> json) {
    return WebSocketMessage(
      type: json['type'] as String? ?? '',
      payload: json['payload'] as Map<String, dynamic>? ?? {},
    );
  }

  Map<String, dynamic> toJson() => {'type': type, 'payload': payload};
}

/// WebSocket service for real-time communication
class WebSocketService {
  WebSocketService({
    WebSocketChannelFactory? channelFactory,
    WebSocketUriBuilder? uriBuilder,
  }) : _channelFactory = channelFactory ?? _connectWithAuthorizationHeader,
       _uriBuilder = uriBuilder ?? buildUri;

  final WebSocketChannelFactory _channelFactory;
  final WebSocketUriBuilder _uriBuilder;

  WebSocketChannel? _channel;
  StreamSubscription? _subscription;
  Timer? _pingTimer;
  Timer? _reconnectTimer;

  bool _isConnected = false;
  bool _isAuthenticated = false;
  bool _intentionalDisconnect = false;
  String? _clientId;
  String? _authToken;
  int _reconnectAttempts = 0;
  int _connectionGeneration = 0;
  static const int _maxReconnectAttempts = 5;
  String? _userId;

  final Set<String> _joinedRooms = {};
  final Set<String> _desiredRooms = {};

  static Uri buildUri(String? authToken) {
    final uri = Uri.parse(ApiConfig.wsBaseUrl);
    if (authToken == null || authToken.isEmpty) {
      return uri;
    }

    return uri;
  }

  static WebSocketChannel _connectWithAuthorizationHeader(
    Uri uri, {
    String? authToken,
  }) {
    if (authToken == null || authToken.isEmpty) {
      return IOWebSocketChannel.connect(uri);
    }

    return IOWebSocketChannel.connect(
      uri,
      headers: {'Authorization': 'Bearer $authToken'},
    );
  }

  // Event streams
  final _messageController = StreamController<WebSocketMessage>.broadcast();
  final _connectionController = StreamController<bool>.broadcast();
  final _toastController = StreamController<Map<String, dynamic>>.broadcast();
  final _commentController = StreamController<Map<String, dynamic>>.broadcast();
  final _newCheckinController =
      StreamController<Map<String, dynamic>>.broadcast();
  final _sameEventController =
      StreamController<Map<String, dynamic>>.broadcast();

  /// Stream of all WebSocket messages
  Stream<WebSocketMessage> get messageStream => _messageController.stream;

  /// Stream of connection status changes
  Stream<bool> get connectionStream => _connectionController.stream;

  /// Stream of new toast notifications
  Stream<Map<String, dynamic>> get toastStream => _toastController.stream;

  /// Stream of new comment notifications
  Stream<Map<String, dynamic>> get commentStream => _commentController.stream;

  /// Stream of new check-in events (friend checked in)
  Stream<Map<String, dynamic>> get newCheckinStream =>
      _newCheckinController.stream;

  /// Stream of same-event check-in events ("Alex is here too!")
  Stream<Map<String, dynamic>> get sameEventCheckinStream =>
      _sameEventController.stream;

  /// Whether the WebSocket is connected
  bool get isConnected => _isConnected;

  /// Whether the WebSocket is authenticated
  bool get isAuthenticated => _isAuthenticated;

  /// Connect to WebSocket server
  Future<void> connect({String? authToken, String? userId}) async {
    if (_isConnected) {
      LogService.w('WebSocket already connected');
      return;
    }

    final generation = ++_connectionGeneration;
    _authToken = authToken;
    _userId = userId;
    _intentionalDisconnect = false;

    try {
      final uri = _uriBuilder(_authToken);
      LogService.i('Connecting to WebSocket');

      final channel = _channelFactory(uri, authToken: _authToken);
      _channel = channel;

      // Wait for connection to be ready
      await channel.ready;
      if (generation != _connectionGeneration) {
        await channel.sink.close(status.goingAway);
        return;
      }

      _isConnected = true;
      _reconnectAttempts = 0;
      _connectionController.add(true);
      LogService.i('WebSocket connected');

      // Listen to messages
      _subscription = channel.stream.listen(
        (data) {
          if (generation == _connectionGeneration) {
            _handleMessage(data);
          }
        },
        onError: (Object error) => _handleError(error, generation),
        onDone: () => _handleDisconnect(generation),
      );

      // Start ping timer to keep connection alive
      _startPingTimer();

      // Initial auth happens during upgrade via the Authorization header.
      // authenticate() remains available for compatibility with older servers.
    } catch (e, stack) {
      if (generation != _connectionGeneration) return;
      LogService.e('WebSocket connection failed', e, stack);
      _isConnected = false;
      _connectionController.add(false);
      _scheduleReconnect(generation);
    }
  }

  /// Disconnect from WebSocket server
  void disconnect({bool clearCredentials = true}) {
    LogService.i('Disconnecting WebSocket');

    _connectionGeneration++;
    _intentionalDisconnect = true;
    _pingTimer?.cancel();
    _reconnectTimer?.cancel();
    _subscription?.cancel();

    _channel?.sink.close(status.goingAway);
    _channel = null;
    _subscription = null;

    _isConnected = false;
    _isAuthenticated = false;
    _clientId = null;
    if (clearCredentials) {
      _authToken = null;
      _userId = null;
      _joinedRooms.clear();
      _desiredRooms.clear();
    }

    _connectionController.add(false);
  }

  /// Authenticate the WebSocket connection
  void authenticate(String userId, String token) {
    if (!_isConnected) {
      LogService.w('Cannot authenticate: not connected');
      return;
    }

    _userId = userId;
    _authToken = token;

    _send(
      WebSocketMessage(
        type: 'auth',
        payload: {'userId': userId, 'token': token},
      ),
    );
  }

  /// Join a room for targeted messages
  void joinRoom(String room) {
    _desiredRooms.add(room);

    if (!_isConnected) {
      return;
    }

    _send(WebSocketMessage(type: 'join_room', payload: {'room': room}));

    _joinedRooms.add(room);
  }

  /// Leave a room
  void leaveRoom(String room) {
    _desiredRooms.remove(room);

    if (!_isConnected) {
      _joinedRooms.remove(room);
      return;
    }

    _send(WebSocketMessage(type: 'leave_room', payload: {'room': room}));

    _joinedRooms.remove(room);
  }

  /// Join a check-in room to receive toast/comment updates
  void joinCheckinRoom(String checkinId) {
    joinRoom('checkin:$checkinId');
  }

  /// Leave a check-in room
  void leaveCheckinRoom(String checkinId) {
    leaveRoom('checkin:$checkinId');
  }

  /// Join an event attendance room for same-event realtime alerts.
  void joinEventRoom(String eventId) {
    joinRoom('event:$eventId');
  }

  /// Leave an event attendance room.
  void leaveEventRoom(String eventId) {
    leaveRoom('event:$eventId');
  }

  /// Send a raw message
  void _send(WebSocketMessage message) {
    if (!_isConnected || _channel == null) {
      LogService.w('Cannot send message: not connected');
      return;
    }

    try {
      final json = jsonEncode(message.toJson());
      _channel!.sink.add(json);
      LogService.d('WS sent: ${message.type}');
    } catch (e) {
      LogService.e('Failed to send WebSocket message', e);
    }
  }

  /// Handle incoming message
  void _handleMessage(dynamic data) {
    try {
      final json = jsonDecode(data as String) as Map<String, dynamic>;
      final message = WebSocketMessage.fromJson(json);

      LogService.d('WS received: ${message.type}');

      // Handle specific message types
      switch (message.type) {
        case WebSocketEvents.connected:
          _clientId = message.payload['clientId'] as String?;
          LogService.i('WebSocket client ID: $_clientId');
          break;

        case WebSocketEvents.authenticated:
          _isAuthenticated = true;
          LogService.i('WebSocket authenticated');
          // Re-join desired rooms after authenticated reconnects.
          for (final room in _desiredRooms) {
            _send(WebSocketMessage(type: 'join_room', payload: {'room': room}));
          }
          break;

        case WebSocketEvents.joinedRoom:
          final room = message.payload['room'] as String?;
          if (room != null) {
            _joinedRooms.add(room);
          }
          break;

        case WebSocketEvents.leftRoom:
          final room = message.payload['room'] as String?;
          if (room != null) {
            _joinedRooms.remove(room);
          }
          break;

        case WebSocketEvents.error:
          LogService.e('WebSocket error: ${message.payload['message']}');
          break;

        case WebSocketEvents.pong:
          // Heartbeat response
          break;

        case WebSocketEvents.newToast:
          _toastController.add(message.payload);
          break;

        case WebSocketEvents.newComment:
          _commentController.add(message.payload);
          break;

        case WebSocketEvents.newCheckin:
          _newCheckinController.add(message.payload);
          break;

        case WebSocketEvents.sameEventCheckin:
          _sameEventController.add(message.payload);
          break;

        default:
          break;
      }

      // Emit to general message stream
      _messageController.add(message);
    } catch (e, stack) {
      LogService.e('Failed to parse WebSocket message', e, stack);
    }
  }

  /// Handle WebSocket error
  void _handleError(dynamic error, int generation) {
    if (generation != _connectionGeneration) return;
    LogService.e('WebSocket error', error);
    _isConnected = false;
    _isAuthenticated = false;
    _pingTimer?.cancel();
    _connectionController.add(false);
    _scheduleReconnect(generation);
  }

  /// Handle WebSocket disconnect
  void _handleDisconnect(int generation) {
    if (generation != _connectionGeneration) return;
    LogService.w('WebSocket disconnected');
    _isConnected = false;
    _isAuthenticated = false;
    _pingTimer?.cancel();
    _connectionController.add(false);
    _scheduleReconnect(generation);
  }

  /// Start ping timer to keep connection alive
  void _startPingTimer() {
    _pingTimer?.cancel();
    _pingTimer = Timer.periodic(const Duration(seconds: 25), (_) {
      if (_isConnected) {
        _send(WebSocketMessage(type: 'ping', payload: {}));
      }
    });
  }

  /// Schedule a reconnection attempt with exponential backoff
  void _scheduleReconnect(int generation) {
    if (generation != _connectionGeneration) return;
    _reconnectTimer?.cancel();

    if (_intentionalDisconnect || _authToken == null || _userId == null) {
      LogService.i('WebSocket reconnect suppressed');
      return;
    }

    if (_reconnectAttempts >= _maxReconnectAttempts) {
      LogService.w(
        'WebSocket max reconnect attempts reached ($_maxReconnectAttempts). Giving up.',
      );
      return;
    }

    // Exponential backoff: 5s, 10s, 20s, 40s, 80s
    final delay = Duration(seconds: 5 * (1 << _reconnectAttempts));
    _reconnectAttempts++;

    _reconnectTimer = Timer(delay, () {
      if (generation == _connectionGeneration &&
          !_isConnected &&
          !_intentionalDisconnect &&
          _authToken != null &&
          _userId != null) {
        LogService.i(
          'Attempting WebSocket reconnection (attempt $_reconnectAttempts/$_maxReconnectAttempts)...',
        );
        connect(authToken: _authToken, userId: _userId);
      }
    });
  }

  /// Clean up resources
  void dispose() {
    disconnect();
    _messageController.close();
    _connectionController.close();
    _toastController.close();
    _commentController.close();
    _newCheckinController.close();
    _sameEventController.close();
  }
}
