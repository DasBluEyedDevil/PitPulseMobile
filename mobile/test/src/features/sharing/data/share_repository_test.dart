import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:soundcheck_flutter/src/core/api/dio_client.dart';
import 'package:soundcheck_flutter/src/core/error/failures.dart';
import 'package:soundcheck_flutter/src/features/sharing/data/share_repository.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('ShareRepository', () {
    test(
      'parses check-in share-card URLs and sends the canonical path',
      () async {
        final client = _RecordingDioClient(
          outcomes: [
            Response<dynamic>(
              requestOptions: RequestOptions(path: '/share/checkin/checkin-1'),
              data: {
                'data': {
                  'ogUrl': 'https://cdn.example/checkin-og.png',
                  'storiesUrl': 'https://cdn.example/checkin-stories.png',
                },
              },
            ),
          ],
        );
        final repository = ShareRepository(client);

        final result = await repository.generateCheckinCard('checkin-1');

        expect(client.paths, ['/share/checkin/checkin-1']);
        result.fold(
          (failure) => fail('Expected URLs, got ${failure.message}'),
          (urls) {
            expect(urls.ogUrl, 'https://cdn.example/checkin-og.png');
            expect(urls.storiesUrl, 'https://cdn.example/checkin-stories.png');
          },
        );
      },
    );

    test('parses badge share-card URLs and sends the canonical path', () async {
      final client = _RecordingDioClient(
        outcomes: [
          Response<dynamic>(
            requestOptions: RequestOptions(path: '/share/badge/award-1'),
            data: {
              'data': {
                'ogUrl': 'https://cdn.example/badge-og.png',
                'storiesUrl': 'https://cdn.example/badge-stories.png',
              },
            },
          ),
        ],
      );
      final repository = ShareRepository(client);

      final result = await repository.generateBadgeCard('award-1');

      expect(client.paths, ['/share/badge/award-1']);
      result.fold((failure) => fail('Expected URLs, got ${failure.message}'), (
        urls,
      ) {
        expect(urls.ogUrl, 'https://cdn.example/badge-og.png');
        expect(urls.storiesUrl, 'https://cdn.example/badge-stories.png');
      });
    });

    test(
      'classifies an offline request as a retryable network failure',
      () async {
        final client = _RecordingDioClient(
          outcomes: [
            DioException(
              requestOptions: RequestOptions(path: '/share/checkin/checkin-1'),
              type: DioExceptionType.connectionError,
            ),
          ],
        );
        final repository = ShareRepository(client);

        final result = await repository.generateCheckinCard('checkin-1');

        expect(
          result.fold((failure) => failure, (_) => fail('Expected failure')),
          isA<NetworkFailure>().having(
            (failure) => failure.message,
            'message',
            contains('No internet connection'),
          ),
        );
      },
    );

    test('classifies a timeout as a retryable network failure', () async {
      final client = _RecordingDioClient(
        outcomes: [
          DioException(
            requestOptions: RequestOptions(path: '/share/badge/award-1'),
            type: DioExceptionType.receiveTimeout,
          ),
        ],
      );
      final repository = ShareRepository(client);

      final result = await repository.generateBadgeCard('award-1');

      expect(
        result.fold((failure) => failure, (_) => fail('Expected failure')),
        isA<NetworkFailure>().having(
          (failure) => failure.message,
          'message',
          contains('Connection timeout'),
        ),
      );
    });

    test(
      'returns an observable server failure for malformed payloads',
      () async {
        final client = _RecordingDioClient(
          outcomes: [
            Response<dynamic>(
              requestOptions: RequestOptions(path: '/share/checkin/checkin-1'),
              data: {
                'data': {'ogUrl': 'https://cdn.example/checkin-og.png'},
              },
            ),
          ],
        );
        final repository = ShareRepository(client);

        final result = await repository.generateCheckinCard('checkin-1');

        expect(
          result.fold((failure) => failure, (_) => fail('Expected failure')),
          isA<ServerFailure>().having(
            (failure) => failure.message,
            'message',
            contains('Unexpected error'),
          ),
        );
      },
    );

    test('preserves an existing domain failure from the API layer', () async {
      final client = _RecordingDioClient(
        outcomes: [const AuthFailure('Session expired')],
      );
      final repository = ShareRepository(client);

      final result = await repository.generateCheckinCard('checkin-1');

      expect(
        result.fold((failure) => failure, (_) => fail('Expected failure')),
        isA<AuthFailure>().having(
          (failure) => failure.message,
          'message',
          'Session expired',
        ),
      );
    });
  });
}

class _RecordingDioClient extends DioClient {
  _RecordingDioClient({required List<Object> outcomes})
    : _outcomes = [...outcomes],
      super(secureStorage: const FlutterSecureStorage());

  final List<Object> _outcomes;
  final List<String> paths = [];

  @override
  Future<Response<dynamic>> post(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    paths.add(path);
    final outcome = _outcomes.removeAt(0);
    if (outcome is Response<dynamic>) return outcome;
    throw outcome;
  }
}
