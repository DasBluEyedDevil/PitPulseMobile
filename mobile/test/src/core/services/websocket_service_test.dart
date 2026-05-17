import 'dart:async';
import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:web_socket_channel/web_socket_channel.dart';

import 'package:soundcheck_flutter/src/core/services/websocket_service.dart';

class _FakeWebSocketChannel implements WebSocketChannel {
  _FakeWebSocketChannel();

  final StreamController<dynamic> incoming = StreamController<dynamic>();
  final _FakeWebSocketSink _sink = _FakeWebSocketSink();

  @override
  int? get closeCode => null;

  @override
  String? get closeReason => null;

  @override
  String? get protocol => null;

  @override
  Future<void> get ready => Future.value();

  @override
  WebSocketSink get sink => _sink;

  @override
  Stream get stream => incoming.stream;

  List<String> get sentMessages => _sink.sentMessages;
  bool get isClosed => _sink.isClosed;

  void addServerMessage(
    String type, [
    Map<String, dynamic> payload = const {},
  ]) {
    incoming.add(jsonEncode({'type': type, 'payload': payload}));
  }

  Future<void> closeFromServer() async {
    await incoming.close();
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class _FakeWebSocketSink implements WebSocketSink {
  final List<String> sentMessages = [];
  final Completer<void> _done = Completer<void>();
  bool isClosed = false;

  @override
  Future get done => _done.future;

  @override
  void add(event) {
    sentMessages.add(event as String);
  }

  @override
  void addError(Object error, [StackTrace? stackTrace]) {}

  @override
  Future addStream(Stream stream) async {}

  @override
  Future close([int? closeCode, String? closeReason]) async {
    isClosed = true;
    if (!_done.isCompleted) {
      _done.complete();
    }
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

Map<String, dynamic> _sentMessage(String raw) {
  return jsonDecode(raw) as Map<String, dynamic>;
}

void main() {
  test('buildUri does not place bearer tokens in the URL', () {
    final uri = WebSocketService.buildUri('jwt with spaces+/=');

    expect(uri.scheme, anyOf('ws', 'wss'));
    expect(uri.queryParameters.containsKey('token'), isFalse);
    expect(uri.toString(), isNot(contains('jwt')));
  });

  test(
    'connect uses injectable URI builder and does not send initial auth message',
    () async {
      final channel = _FakeWebSocketChannel();
      Uri? connectedUri;
      String? connectedToken;
      final service = WebSocketService(
        uriBuilder: (_) => Uri.parse('wss://example.test/socket'),
        channelFactory: (uri, {authToken}) {
          connectedUri = uri;
          connectedToken = authToken;
          return channel;
        },
      );

      await service.connect(authToken: 'abc123', userId: 'user-1');

      expect(connectedUri.toString(), 'wss://example.test/socket');
      expect(connectedToken, 'abc123');
      expect(channel.sentMessages, isEmpty);

      service.dispose();
    },
  );

  test(
    'authenticated event flips auth state and rejoins desired rooms',
    () async {
      final channel = _FakeWebSocketChannel();
      final service = WebSocketService(
        uriBuilder: (_) => Uri.parse('wss://example.test/socket'),
        channelFactory: (_, {authToken}) => channel,
      );

      service.joinCheckinRoom('checkin-1');
      service.joinEventRoom('event-1');
      await service.connect(authToken: 'abc123', userId: 'user-1');

      expect(service.isAuthenticated, isFalse);
      channel.addServerMessage(WebSocketEvents.authenticated, {
        'userId': 'user-1',
      });
      await Future<void>.delayed(Duration.zero);

      expect(service.isAuthenticated, isTrue);
      final sentTypes = channel.sentMessages
          .map(_sentMessage)
          .map((m) => m['type']);
      expect(sentTypes, everyElement('join_room'));
      expect(
        channel.sentMessages.map(_sentMessage).map((m) => m['payload']['room']),
        containsAll(['checkin:checkin-1', 'event:event-1']),
      );

      service.dispose();
    },
  );

  test(
    'intentional disconnect clears credentials and suppresses reconnect',
    () async {
      final channels = <_FakeWebSocketChannel>[];
      final service = WebSocketService(
        uriBuilder: (_) => Uri.parse('wss://example.test/socket'),
        channelFactory: (_, {authToken}) {
          final channel = _FakeWebSocketChannel();
          channels.add(channel);
          return channel;
        },
      );

      await service.connect(authToken: 'abc123', userId: 'user-1');
      service.joinEventRoom('event-1');
      service.disconnect();
      await channels.single.closeFromServer();

      expect(service.isConnected, isFalse);
      expect(service.isAuthenticated, isFalse);
      expect(channels, hasLength(1));
      expect(channels.single.isClosed, isTrue);

      service.dispose();
    },
  );
}
