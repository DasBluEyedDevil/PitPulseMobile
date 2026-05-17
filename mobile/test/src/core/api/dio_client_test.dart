import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:soundcheck_flutter/src/core/api/dio_client.dart';
import 'package:soundcheck_flutter/src/core/error/failures.dart';

void main() {
  group('DioClient.handleDioError', () {
    Failure failureFor({required int statusCode, required dynamic data}) {
      return DioClient.handleDioError(
        DioException(
          requestOptions: RequestOptions(path: '/test'),
          response: Response<dynamic>(
            requestOptions: RequestOptions(path: '/test'),
            statusCode: statusCode,
            data: data,
          ),
          type: DioExceptionType.badResponse,
        ),
      );
    }

    test('parses legacy string error responses', () {
      final failure = failureFor(
        statusCode: 400,
        data: {'error': 'Legacy validation failed'},
      );

      expect(failure, isA<ValidationFailure>());
      expect(failure.message, 'Legacy validation failed');
    });

    test('prefers nested error message over map string output', () {
      final failure = failureFor(
        statusCode: 422,
        data: {
          'success': false,
          'error': {
            'code': 'VALIDATION_ERROR',
            'message': 'Email is invalid',
            'details': [
              {'message': 'Nested detail should not win'},
            ],
          },
        },
      );

      expect(failure, isA<ValidationFailure>());
      expect(failure.message, 'Email is invalid');
      expect(failure.message, isNot(contains('{')));
    });

    test('parses top-level message responses', () {
      final failure = failureFor(
        statusCode: 404,
        data: {'message': 'Band not found'},
      );

      expect(failure, isA<NotFoundFailure>());
      expect(failure.message, 'Resource not found: Band not found');
    });

    test('joins top-level validation error arrays', () {
      final failure = failureFor(
        statusCode: 400,
        data: {
          'errors': [
            {'message': 'Email is required'},
            {'message': 'Password is required'},
          ],
        },
      );

      expect(failure, isA<ValidationFailure>());
      expect(failure.message, 'Email is required, Password is required');
    });

    test('maps 409 responses to ConflictFailure', () {
      final failure = failureFor(
        statusCode: 409,
        data: {
          'error': {'code': 'CONFLICT', 'message': 'Username already exists'},
        },
      );

      expect(failure, isA<ConflictFailure>());
      expect(failure.message, 'Username already exists');
    });

    test('preserves timeout and network classifications', () {
      final timeout = DioClient.handleDioError(
        DioException(
          requestOptions: RequestOptions(path: '/test'),
          type: DioExceptionType.connectionTimeout,
        ),
      );
      final network = DioClient.handleDioError(
        DioException(
          requestOptions: RequestOptions(path: '/test'),
          type: DioExceptionType.connectionError,
        ),
      );

      expect(timeout, isA<NetworkFailure>());
      expect(network, isA<NetworkFailure>());
    });
  });
}
