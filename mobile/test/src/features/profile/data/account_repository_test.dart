import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:soundcheck_flutter/src/core/api/dio_client.dart';
import 'package:soundcheck_flutter/src/core/error/failures.dart';
import 'package:soundcheck_flutter/src/features/profile/data/account_repository.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('AccountRepository', () {
    test(
      'requests deletion and returns the scheduled lifecycle state',
      () async {
        final client = _AccountDioClient([
          _response('/users/me/delete-account', {
            'data': {
              'status': 'pending_deletion',
              'scheduledDeletionAt': '2026-08-26T00:00:00Z',
            },
          }),
        ]);
        final repository = AccountRepository(client);

        final result = await repository.requestAccountDeletion();

        expect(client.paths, ['/users/me/delete-account']);
        result.fold(
          (failure) => fail('Expected deletion state, got ${failure.message}'),
          (data) => expect(data['status'], 'pending_deletion'),
        );
      },
    );

    test('cancels a pending deletion', () async {
      final client = _AccountDioClient([
        _response('/users/me/cancel-deletion', const <String, dynamic>{}),
      ]);

      final result = await AccountRepository(client).cancelDeletion();

      expect(client.paths, ['/users/me/cancel-deletion']);
      expect(result.isRight(), isTrue);
    });

    test(
      'returns a pending deletion status and the no-request state',
      () async {
        final pendingClient = _AccountDioClient([
          _response('/users/me/deletion-status', {
            'data': {'status': 'pending_deletion'},
          }),
        ]);
        final emptyClient = _AccountDioClient([
          _response('/users/me/deletion-status', {'data': null}),
        ]);

        final pending = await AccountRepository(
          pendingClient,
        ).getDeletionStatus();
        final empty = await AccountRepository(emptyClient).getDeletionStatus();

        pending.fold(
          (failure) => fail('Expected status, got ${failure.message}'),
          (data) => expect(data?['status'], 'pending_deletion'),
        );
        empty.fold(
          (failure) => fail('Expected empty status, got ${failure.message}'),
          (data) => expect(data, isNull),
        );
      },
    );

    test(
      'preserves classified failures from every lifecycle command',
      () async {
        for (final operation in [
          (AccountRepository repository) => repository.requestAccountDeletion(),
          (AccountRepository repository) => repository.cancelDeletion(),
          (AccountRepository repository) => repository.getDeletionStatus(),
        ]) {
          final repository = AccountRepository(
            _AccountDioClient([const AuthFailure('Session expired')]),
          );

          final result = await operation(repository);

          expect(
            result.fold((failure) => failure, (_) => fail('Expected failure')),
            isA<AuthFailure>().having(
              (failure) => failure.message,
              'message',
              'Session expired',
            ),
          );
        }
      },
    );

    test('maps network errors without losing offline semantics', () async {
      final repository = AccountRepository(
        _AccountDioClient([
          DioException(
            requestOptions: RequestOptions(path: '/users/me/delete-account'),
            type: DioExceptionType.connectionError,
          ),
        ]),
      );

      final result = await repository.requestAccountDeletion();

      expect(
        result.fold((failure) => failure, (_) => fail('Expected failure')),
        isA<NetworkFailure>(),
      );
    });

    test('maps malformed payloads to a retryable server failure', () async {
      final repository = AccountRepository(
        _AccountDioClient([
          _response('/users/me/delete-account', {
            'data': ['unexpected'],
          }),
        ]),
      );

      final result = await repository.requestAccountDeletion();

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

Response<dynamic> _response(String path, dynamic data) {
  return Response<dynamic>(
    requestOptions: RequestOptions(path: path),
    data: data,
    statusCode: 200,
  );
}

class _AccountDioClient extends DioClient {
  _AccountDioClient(List<Object> outcomes)
    : _outcomes = [...outcomes],
      super(secureStorage: const FlutterSecureStorage());

  final List<Object> _outcomes;
  final paths = <String>[];

  Future<Response<dynamic>> _next(String path) async {
    paths.add(path);
    final outcome = _outcomes.removeAt(0);
    if (outcome is Response<dynamic>) return outcome;
    throw outcome;
  }

  @override
  Future<Response<dynamic>> get(
    String path, {
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) {
    return _next(path);
  }

  @override
  Future<Response<dynamic>> post(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) {
    return _next(path);
  }
}
