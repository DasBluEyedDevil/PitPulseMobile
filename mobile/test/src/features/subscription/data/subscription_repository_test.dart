import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:soundcheck_flutter/src/core/api/dio_client.dart';
import 'package:soundcheck_flutter/src/core/error/failures.dart';
import 'package:soundcheck_flutter/src/features/subscription/data/subscription_repository.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('SubscriptionRepository', () {
    test(
      'reads authoritative premium status from the canonical endpoint',
      () async {
        final client = _SubscriptionDioClient(
          outcomes: [
            Response<dynamic>(
              requestOptions: RequestOptions(path: '/subscription/status'),
              data: {
                'data': {
                  'isPremium': true,
                  'productId': 'soundcheck_pro_monthly',
                  'expiresAt': '2026-08-27T00:00:00Z',
                },
              },
            ),
          ],
        );
        final repository = SubscriptionRepository(client);

        final result = await repository.getStatus();

        expect(client.paths, ['/subscription/status']);
        result.fold(
          (failure) => fail('Expected status, got ${failure.message}'),
          (status) {
            expect(status.isPremium, isTrue);
            expect(status.productId, 'soundcheck_pro_monthly');
            expect(status.expiresAt, '2026-08-27T00:00:00Z');
          },
        );
      },
    );

    test('classifies offline status checks as network degradation', () async {
      final client = _SubscriptionDioClient(
        outcomes: [
          DioException(
            requestOptions: RequestOptions(path: '/subscription/status'),
            type: DioExceptionType.connectionError,
          ),
        ],
      );
      final repository = SubscriptionRepository(client);

      final result = await repository.getStatus();

      expect(
        result.fold((failure) => failure, (_) => fail('Expected failure')),
        isA<NetworkFailure>(),
      );
    });

    test('returns a server failure when status payload is malformed', () async {
      final client = _SubscriptionDioClient(
        outcomes: [
          Response<dynamic>(
            requestOptions: RequestOptions(path: '/subscription/status'),
            data: {
              'data': ['not-a-status-object'],
            },
          ),
        ],
      );
      final repository = SubscriptionRepository(client);

      final result = await repository.getStatus();

      expect(
        result.fold((failure) => failure, (_) => fail('Expected failure')),
        isA<ServerFailure>().having(
          (failure) => failure.message,
          'message',
          contains('Unexpected error'),
        ),
      );
    });
  });
}

class _SubscriptionDioClient extends DioClient {
  _SubscriptionDioClient({required List<Object> outcomes})
    : _outcomes = [...outcomes],
      super(secureStorage: const FlutterSecureStorage());

  final List<Object> _outcomes;
  final List<String> paths = [];

  @override
  Future<Response<dynamic>> get(
    String path, {
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    paths.add(path);
    final outcome = _outcomes.removeAt(0);
    if (outcome is Response<dynamic>) return outcome;
    throw outcome;
  }
}
