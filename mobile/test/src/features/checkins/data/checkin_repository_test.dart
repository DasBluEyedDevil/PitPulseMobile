import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:soundcheck_flutter/src/core/api/dio_client.dart';
import 'package:soundcheck_flutter/src/core/error/failures.dart';
import 'package:soundcheck_flutter/src/features/checkins/data/checkin_repository.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('CheckInRepository request/response contracts', () {
    test(
      'covers the complete check-in, social, and stats API surface',
      () async {
        final client = _QueueDioClient(
          outcomes: [
            _response({
              'data': [_checkinJson('feed-1')],
            }),
            _response({
              'data': [_checkinJson('list-1')],
            }),
            _response({'data': _checkinJson('detail-1')}),
            _response({'success': true}),
            _response({
              'data': [
                {'id': 'vibe-1', 'name': 'mosh_pit', 'displayName': 'Mosh Pit'},
              ],
            }),
            _response({
              'data': [
                {'id': 'event-1', 'eventDate': '2026-07-27T20:00:00Z'},
              ],
            }),
            _response({'data': _checkinJson('event-checkin')}),
            _response({'data': _checkinJson('manual-checkin')}),
            _response({'data': _checkinJson('rated-checkin')}),
            _response({'success': true}),
            _response({'success': true}),
            _response({
              'data': [
                {
                  'id': 'toast-1',
                  'userId': 'user-2',
                  'checkinId': 'checkin-1',
                  'createdAt': '2026-07-27T20:00:00Z',
                },
              ],
            }),
            _response({
              'data': {
                'id': 'comment-1',
                'checkinId': 'checkin-1',
                'userId': 'user-2',
                'content': 'Great set',
                'createdAt': '2026-07-27T20:00:00Z',
                'updatedAt': '2026-07-27T20:00:00Z',
              },
            }),
            _response({
              'data': [
                {
                  'id': 'comment-1',
                  'checkinId': 'checkin-1',
                  'userId': 'user-2',
                  'content': 'Great set',
                  'createdAt': '2026-07-27T20:00:00Z',
                  'updatedAt': '2026-07-27T20:00:00Z',
                },
              ],
            }),
            _response({'success': true}),
            _response({
              'data': {'totalCheckins': 4, 'uniqueBands': 3},
            }),
            _response({
              'data': [_checkinJson('recent-1')],
            }),
          ],
        );
        final repository = CheckInRepository(dioClient: client);

        final feed = await repository.getFeed(
          filter: 'all',
          limit: 10,
          offset: 20,
        );
        final list = await repository.getCheckIns(
          venueId: 'venue-1',
          bandId: 'band-1',
          userId: 'user-1',
          page: 2,
          limit: 5,
        );
        final detail = await repository.getCheckInById('detail-1');
        final deletion = await repository.deleteCheckIn('delete-1');
        final vibes = await repository.getVibeTags();
        final nearby = await repository.getNearbyEvents(
          40.75,
          -73.98,
          radius: 25,
          limit: 8,
        );
        final eventCheckin = await repository.createEventCheckIn(
          eventId: 'event-1',
          locationLat: 40.75,
          locationLon: -73.98,
        );
        final manualCheckin = await repository.createManualCheckIn(
          bandId: 'band-1',
          venueId: 'venue-1',
          rating: 4.5,
          comment: 'Great set',
          vibeTagIds: ['vibe-1'],
          locationLat: 40.75,
          locationLon: -73.98,
        );
        final rated = await repository.submitRatings(
          'rated-checkin',
          bandRatings: [
            {'bandId': 'band-1', 'rating': 4.5},
          ],
          venueRating: 4,
        );
        final toasted = await repository.toastCheckIn('checkin-1');
        final untoasted = await repository.untoastCheckIn('checkin-1');
        final toasts = await repository.getCheckInToasts('checkin-1');
        final comment = await repository.addComment('checkin-1', 'Great set');
        final comments = await repository.getCheckInComments(
          'checkin-1',
          page: 2,
          limit: 5,
        );
        final commentDeletion = await repository.deleteComment(
          'checkin-1',
          'comment-1',
        );
        final stats = await repository.getUserStats('user-1');
        final recent = await repository.getUserRecentCheckIns(
          'user-1',
          limit: 3,
        );

        for (final result in [
          feed,
          list,
          detail,
          deletion,
          vibes,
          nearby,
          eventCheckin,
          manualCheckin,
          rated,
          toasted,
          untoasted,
          toasts,
          comment,
          comments,
          commentDeletion,
          stats,
          recent,
        ]) {
          expect(result.isRight(), isTrue);
        }
        expect(
          nearby.fold((_) => fail('Expected nearby event'), (events) => events),
          hasLength(1),
        );
        expect(
          comment.fold(
            (_) => fail('Expected comment'),
            (created) => created.content,
          ),
          'Great set',
        );
        expect(
          stats.fold((_) => fail('Expected stats'), (value) => value),
          containsPair('totalCheckins', 4),
        );

        expect(
          client.calls[0],
          _call(
            'GET',
            '/checkins/feed',
            query: {'filter': 'all', 'limit': 10, 'offset': 20},
          ),
        );
        expect(
          client.calls[1],
          _call(
            'GET',
            '/checkins',
            query: {
              'page': 2,
              'limit': 5,
              'venueId': 'venue-1',
              'bandId': 'band-1',
              'userId': 'user-1',
            },
          ),
        );
        expect(
          client.calls[5],
          _call(
            'GET',
            '/events/nearby',
            query: {'lat': 40.75, 'lng': -73.98, 'radius': 25.0, 'limit': 8},
          ),
        );
        expect(
          client.calls[6],
          _call(
            'POST',
            '/checkins',
            data: {
              'eventId': 'event-1',
              'locationLat': 40.75,
              'locationLon': -73.98,
            },
          ),
        );
        expect(
          client.calls[7],
          _call(
            'POST',
            '/checkins',
            data: {
              'bandId': 'band-1',
              'venueId': 'venue-1',
              'rating': 4.5,
              'comment': 'Great set',
              'vibeTagIds': ['vibe-1'],
              'locationLat': 40.75,
              'locationLon': -73.98,
            },
          ),
        );
        expect(
          client.calls[8],
          _call(
            'PATCH',
            '/checkins/rated-checkin/ratings',
            data: {
              'bandRatings': [
                {'bandId': 'band-1', 'rating': 4.5},
              ],
              'venueRating': 4.0,
            },
          ),
        );
        expect(
          client.calls[12],
          _call(
            'POST',
            '/checkins/checkin-1/comments',
            data: {'commentText': 'Great set'},
          ),
        );
        expect(
          client.calls[13],
          _call(
            'GET',
            '/checkins/checkin-1/comments',
            query: {'page': 2, 'limit': 5},
          ),
        );
        expect(
          client.calls[16],
          _call(
            'GET',
            '/checkins',
            query: {
              'userId': 'user-1',
              'limit': 3,
              'sort': 'createdAt',
              'order': 'desc',
            },
          ),
        );
      },
    );

    test('omits empty optional values from manual check-in requests', () async {
      final client = _QueueDioClient(
        outcomes: [
          _response({'data': _checkinJson('manual-minimal')}),
        ],
      );
      final repository = CheckInRepository(dioClient: client);

      final result = await repository.createManualCheckIn(
        bandId: 'band-1',
        venueId: 'venue-1',
        rating: 0,
        comment: '',
        vibeTagIds: const [],
      );

      expect(result.isRight(), isTrue);
      expect(
        client.calls.single,
        _call(
          'POST',
          '/checkins',
          data: {'bandId': 'band-1', 'venueId': 'venue-1'},
        ),
      );
    });

    test(
      'maps offline, timeout, and malformed responses to failures',
      () async {
        final client = _QueueDioClient(
          outcomes: [
            DioException(
              requestOptions: RequestOptions(path: '/checkins/feed'),
              type: DioExceptionType.connectionError,
            ),
            DioException(
              requestOptions: RequestOptions(path: '/events/nearby'),
              type: DioExceptionType.receiveTimeout,
            ),
            _response({
              'data': {'id': 'missing-required-fields'},
            }),
          ],
        );
        final repository = CheckInRepository(dioClient: client);

        final offline = await repository.getFeed();
        final timeout = await repository.getNearbyEvents(40.75, -73.98);
        final malformed = await repository.getCheckInById(
          'missing-required-fields',
        );

        expect(
          offline.fold((failure) => failure, (_) => fail('Expected failure')),
          isA<NetworkFailure>(),
        );
        expect(
          timeout.fold((failure) => failure, (_) => fail('Expected failure')),
          isA<NetworkFailure>(),
        );
        expect(
          malformed.fold((failure) => failure, (_) => fail('Expected failure')),
          isA<ServerFailure>().having(
            (failure) => failure.message,
            'message',
            contains('Unexpected error'),
          ),
        );
      },
    );
  });
}

Map<String, dynamic> _checkinJson(String id) => {
  'id': id,
  'userId': 'user-1',
  'createdAt': '2026-07-27T20:00:00Z',
  'updatedAt': '2026-07-27T20:00:00Z',
};

Response<dynamic> _response(dynamic data) => Response<dynamic>(
  requestOptions: RequestOptions(path: '/test'),
  data: data,
);

_RequestCall _call(
  String method,
  String path, {
  dynamic data,
  Map<String, dynamic>? query,
}) => _RequestCall(method, path, data: data, query: query);

class _RequestCall {
  const _RequestCall(this.method, this.path, {this.data, this.query});

  final String method;
  final String path;
  final dynamic data;
  final Map<String, dynamic>? query;

  @override
  bool operator ==(Object other) {
    return other is _RequestCall &&
        other.method == method &&
        other.path == path &&
        _deepEquals(other.data, data) &&
        _deepEquals(other.query, query);
  }

  @override
  int get hashCode => Object.hash(method, path);

  @override
  String toString() =>
      '_RequestCall(method: $method, path: $path, data: $data, query: $query)';
}

bool _deepEquals(Object? left, Object? right) {
  if (left is Map && right is Map) {
    if (left.length != right.length) return false;
    return left.keys.every(
      (key) => right.containsKey(key) && _deepEquals(left[key], right[key]),
    );
  }
  if (left is List && right is List) {
    if (left.length != right.length) return false;
    for (var index = 0; index < left.length; index++) {
      if (!_deepEquals(left[index], right[index])) return false;
    }
    return true;
  }
  return left == right;
}

class _QueueDioClient extends DioClient {
  _QueueDioClient({required List<Object> outcomes})
    : _outcomes = [...outcomes],
      super(secureStorage: const FlutterSecureStorage());

  final List<Object> _outcomes;
  final List<_RequestCall> calls = [];

  Future<Response<dynamic>> _next(
    String method,
    String path, {
    dynamic data,
    Map<String, dynamic>? query,
  }) async {
    calls.add(_RequestCall(method, path, data: data, query: query));
    final outcome = _outcomes.removeAt(0);
    if (outcome is Response<dynamic>) return outcome;
    throw outcome;
  }

  @override
  Future<Response<dynamic>> get(
    String path, {
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) => _next('GET', path, query: queryParameters);

  @override
  Future<Response<dynamic>> post(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) => _next('POST', path, data: data, query: queryParameters);

  @override
  Future<Response<dynamic>> patch(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) => _next('PATCH', path, data: data, query: queryParameters);

  @override
  Future<Response<dynamic>> delete(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) => _next('DELETE', path, data: data, query: queryParameters);
}
