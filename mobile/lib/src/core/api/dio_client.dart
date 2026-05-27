import 'dart:ui' show VoidCallback;

import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../error/failures.dart';
import '../services/log_service.dart';
import 'api_config.dart';

/// Storage key for the refresh token
const _refreshTokenKey = 'refresh_token';

/// DioClient provides a configured Dio instance with interceptors
class DioClient {
  final Dio _dio;
  final FlutterSecureStorage _secureStorage;
  final VoidCallback? _onAuthFailure;

  DioClient({
    required FlutterSecureStorage secureStorage,
    VoidCallback? onAuthFailure,
  }) : _secureStorage = secureStorage,
       _onAuthFailure = onAuthFailure,
       _dio = Dio(
         BaseOptions(
           baseUrl: ApiConfig.baseUrl,
           connectTimeout: ApiConfig.connectTimeout,
           receiveTimeout: ApiConfig.receiveTimeout,
           sendTimeout: ApiConfig.sendTimeout,
           headers: {
             'Content-Type': 'application/json',
             'Accept': 'application/json',
           },
         ),
       ) {
    _initializeInterceptors();
  }

  void _initializeInterceptors() {
    // QueuedInterceptorsWrapper serializes interceptor execution so that
    // multiple concurrent 401s do not race against each other. The first
    // 401 triggers a refresh attempt; subsequent 401s queue behind it.
    _dio.interceptors.add(
      QueuedInterceptorsWrapper(
        onRequest: (options, handler) async {
          // Add JWT token to headers for authenticated requests
          final token = await _secureStorage.read(key: ApiConfig.tokenKey);
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          return handler.next(options);
        },
        onError: (error, handler) async {
          if (error.response?.statusCode == 401) {
            // Attempt token refresh before wiping credentials
            final refreshed = await _attemptTokenRefresh();
            if (refreshed) {
              // Retry the original request with the new token
              try {
                final token = await _secureStorage.read(
                  key: ApiConfig.tokenKey,
                );
                error.requestOptions.headers['Authorization'] = 'Bearer $token';
                final retryResponse = await _dio.fetch(error.requestOptions);
                return handler.resolve(retryResponse);
              } catch (_) {
                // Retry failed -- fall through to credential wipe
              }
            }

            // Refresh failed or no refresh token: clear all credentials
            await _secureStorage.delete(key: ApiConfig.tokenKey);
            await _secureStorage.delete(key: ApiConfig.userKey);
            await _secureStorage.delete(key: _refreshTokenKey);

            // Notify auth state so the UI can redirect to login
            _onAuthFailure?.call();
          }
          return handler.next(error);
        },
      ),
    );

    // Add retry interceptor for idempotent GET requests (MOB-010)
    _dio.interceptors.add(
      InterceptorsWrapper(
        onError: (error, handler) async {
          final isRetryable =
              error.requestOptions.method == 'GET' &&
              (error.type == DioExceptionType.connectionTimeout ||
                  error.type == DioExceptionType.receiveTimeout ||
                  error.type == DioExceptionType.connectionError ||
                  (error.type == DioExceptionType.unknown &&
                      (error.message?.contains('SocketException') ?? false)));

          final retryCount =
              error.requestOptions.extra['_retryCount'] as int? ?? 0;
          const maxRetries = 2;

          if (isRetryable && retryCount < maxRetries) {
            final nextRetry = retryCount + 1;
            final delay = Duration(milliseconds: 500 * (1 << retryCount));
            LogService.d(
              'Retrying GET ${error.requestOptions.path} '
              '(attempt $nextRetry/$maxRetries, backoff ${delay.inMilliseconds}ms)',
            );
            await Future<void>.delayed(delay);
            error.requestOptions.extra['_retryCount'] = nextRetry;
            try {
              final response = await _dio.fetch(error.requestOptions);
              return handler.resolve(response);
            } on DioException catch (retryError) {
              return handler.next(retryError);
            }
          }
          return handler.next(error);
        },
      ),
    );

    // Add logging interceptor in dev mode only.
    // SEC-058: requestHeader: false prevents logging Authorization headers (JWTs).
    // SEC-064: body logging is disabled so passwords, reset tokens, and refresh
    // tokens are not written to local IDE, emulator, or CI logs.
    if (ApiConfig.isDev) {
      _dio.interceptors.add(
        LogInterceptor(
          requestHeader: false,
          requestBody: false,
          responseBody: false,
          error: true,
          logPrint: (object) => LogService.d(object.toString()),
        ),
      );
    }
  }

  /// Attempt to refresh the access token using the stored refresh token.
  /// Returns true if the refresh succeeded and new tokens were stored.
  Future<bool> _attemptTokenRefresh() async {
    try {
      final refreshToken = await _secureStorage.read(key: _refreshTokenKey);
      if (refreshToken == null) return false;

      // Use a fresh Dio instance to avoid interceptor recursion
      final refreshDio = Dio(BaseOptions(baseUrl: ApiConfig.baseUrl));
      final response = await refreshDio.post(
        '/tokens/refresh',
        data: {'refreshToken': refreshToken},
      );

      if (response.statusCode == 200 && response.data['success'] == true) {
        final data = response.data['data'] as Map<String, dynamic>;
        final newAccessToken = data['accessToken'] as String;
        final newRefreshToken = data['refreshToken'] as String;

        await _secureStorage.write(
          key: ApiConfig.tokenKey,
          value: newAccessToken,
        );
        await _secureStorage.write(
          key: _refreshTokenKey,
          value: newRefreshToken,
        );

        return true;
      }
    } catch (e) {
      LogService.d('Token refresh failed: $e');
    }
    return false;
  }

  /// GET request with error classification
  Future<Response> get(
    String path, {
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    try {
      return await _dio.get(
        path,
        queryParameters: queryParameters,
        options: options,
      );
    } on DioException catch (e) {
      throw handleDioError(e);
    }
  }

  /// POST request with error classification
  Future<Response> post(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    try {
      return await _dio.post(
        path,
        data: data,
        queryParameters: queryParameters,
        options: options,
      );
    } on DioException catch (e) {
      throw handleDioError(e);
    }
  }

  /// PUT request with error classification
  Future<Response> put(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    try {
      return await _dio.put(
        path,
        data: data,
        queryParameters: queryParameters,
        options: options,
      );
    } on DioException catch (e) {
      throw handleDioError(e);
    }
  }

  /// DELETE request with error classification
  Future<Response> delete(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    try {
      return await _dio.delete(
        path,
        data: data,
        queryParameters: queryParameters,
        options: options,
      );
    } on DioException catch (e) {
      throw handleDioError(e);
    }
  }

  /// PATCH request with error classification
  Future<Response> patch(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    try {
      return await _dio.patch(
        path,
        data: data,
        queryParameters: queryParameters,
        options: options,
      );
    } on DioException catch (e) {
      throw handleDioError(e);
    }
  }

  /// Handle DioException and convert to Domain Failures
  static Failure handleDioError(DioException error) {
    LogService.e('API Error: ${error.message}', error, error.stackTrace);

    switch (error.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        return const NetworkFailure(
          'Connection timeout. Please check your internet connection.',
        );

      case DioExceptionType.badResponse:
        final statusCode = error.response?.statusCode;
        final data = error.response?.data;
        final message = _extractErrorMessage(data);

        // Log the full response for debugging
        LogService.d('API Error Response: $data');

        if (statusCode == 400) {
          return ValidationFailure(message);
        } else if (statusCode == 401) {
          return const AuthFailure(
            'Authentication required. Please log in again.',
          );
        } else if (statusCode == 403) {
          return ForbiddenFailure('Access denied: $message');
        } else if (statusCode == 404) {
          return NotFoundFailure('Resource not found: $message');
        } else if (statusCode == 409) {
          return ConflictFailure(message);
        } else if (statusCode == 422) {
          return ValidationFailure(message);
        } else if (statusCode == 429) {
          return RateLimitFailure('Too many requests: $message');
        } else if (statusCode != null && statusCode >= 500) {
          return const ServerFailure('Server error. Please try again later.');
        }
        return ServerFailure(message);

      case DioExceptionType.cancel:
        return const UnknownFailure('Request was cancelled');

      case DioExceptionType.connectionError:
        return const NetworkFailure(
          'No internet connection. Please check your network settings.',
        );

      case DioExceptionType.badCertificate:
        return const NetworkFailure('Security certificate error.');

      case DioExceptionType.unknown:
        if (error.message?.contains('SocketException') ?? false) {
          return const NetworkFailure('No internet connection.');
        }
        return const UnknownFailure('An unexpected error occurred.');
    }
  }

  static String _extractErrorMessage(dynamic data) {
    if (data is Map) {
      final error = data['error'];
      if (error is String && error.trim().isNotEmpty) {
        return error;
      }
      if (error is Map) {
        final message = _stringValue(error['message']);
        if (message != null) return message;

        final detailsMessage = _extractErrorsMessage(error['details']);
        if (detailsMessage != null) return detailsMessage;

        final code = _stringValue(error['code']);
        if (code != null) return code;
      }

      final message = _stringValue(data['message']);
      if (message != null) return message;

      final errorsMessage = _extractErrorsMessage(data['errors']);
      if (errorsMessage != null) return errorsMessage;
    }

    return 'Request failed';
  }

  static String? _extractErrorsMessage(dynamic errors) {
    if (errors is List && errors.isNotEmpty) {
      final messages = errors
          .map((error) {
            if (error is Map) {
              return _stringValue(error['message']) ??
                  _stringValue(error['msg']) ??
                  _stringValue(error['error']);
            }
            return _stringValue(error);
          })
          .whereType<String>()
          .toList();

      if (messages.isNotEmpty) {
        return messages.join(', ');
      }
    }

    if (errors is Map) {
      return _stringValue(errors['message']) ?? _stringValue(errors['error']);
    }

    return _stringValue(errors);
  }

  static String? _stringValue(dynamic value) {
    if (value is String && value.trim().isNotEmpty) {
      return value;
    }
    return null;
  }
}
