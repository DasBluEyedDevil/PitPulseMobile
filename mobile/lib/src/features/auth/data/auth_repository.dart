import 'dart:convert';
import 'package:dartz/dartz.dart';
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../../../core/api/dio_client.dart';
import '../../../core/api/api_config.dart';
import '../../../core/error/failures.dart';
import '../domain/user.dart';

class AuthRepository {
  final DioClient _dioClient;
  final FlutterSecureStorage _secureStorage;

  AuthRepository({
    required DioClient dioClient,
    required FlutterSecureStorage secureStorage,
  }) : _dioClient = dioClient,
       _secureStorage = secureStorage;

  /// Helper method to map errors to Failures
  Failure _mapErrorToFailure(Object e) {
    if (e is Failure) return e;
    if (e is DioException) return DioClient.handleDioError(e);
    return ServerFailure('Unexpected error: $e');
  }

  /// Register a new user
  Future<Either<Failure, AuthResponse>> register(
    RegisterRequest request,
  ) async {
    try {
      final response = await _dioClient.post(
        '${ApiConfig.auth}/register',
        data: request.toJson(),
      );

      // Extract data from API wrapper: {success, data, message}
      final data = response.data['data'] as Map<String, dynamic>;
      return Right(AuthResponse.fromJson(data));
    } catch (e) {
      return Left(_mapErrorToFailure(e));
    }
  }

  /// Login user
  Future<Either<Failure, AuthResponse>> login(LoginRequest request) async {
    try {
      final response = await _dioClient.post(
        '${ApiConfig.auth}/login',
        data: request.toJson(),
      );

      // Extract data from API wrapper: {success, data, message}
      final data = response.data['data'] as Map<String, dynamic>;
      return Right(AuthResponse.fromJson(data));
    } catch (e) {
      return Left(_mapErrorToFailure(e));
    }
  }

  /// Persists credentials only while the notifier-owned authentication
  /// operation remains current.
  ///
  /// Callers must serialize this method with logout and newer credential
  /// commits. If the guard changes while a platform write is in flight, the
  /// partial credential set is removed before the serialized section ends.
  Future<bool> persistAuthentication(
    AuthResponse response, {
    required bool Function() isCurrent,
  }) async {
    var wroteCredentials = false;
    try {
      if (!isCurrent()) return false;
      await _secureStorage.write(
        key: ApiConfig.tokenKey,
        value: response.token,
      );
      wroteCredentials = true;
      if (!isCurrent()) {
        await _clearStoredAuthentication();
        return false;
      }

      final refreshToken = response.refreshToken;
      if (refreshToken != null && refreshToken.isNotEmpty) {
        await _secureStorage.write(key: 'refresh_token', value: refreshToken);
        if (!isCurrent()) {
          await _clearStoredAuthentication();
          return false;
        }
      }

      await _secureStorage.write(
        key: ApiConfig.userKey,
        value: jsonEncode(response.user.toJson()),
      );
      if (!isCurrent()) {
        await _clearStoredAuthentication();
        return false;
      }
      return true;
    } catch (error) {
      if (wroteCredentials && !isCurrent()) {
        await _clearStoredAuthentication();
        return false;
      }
      throw _mapErrorToFailure(error);
    }
  }

  Future<void> _clearStoredAuthentication() async {
    await _secureStorage.delete(key: ApiConfig.tokenKey);
    await _secureStorage.delete(key: ApiConfig.userKey);
    await _secureStorage.delete(key: 'refresh_token');
  }

  /// Logout user
  Future<Either<Failure, void>> logout() async {
    try {
      await _clearStoredAuthentication();
      return const Right(null);
    } catch (e) {
      return Left(_mapErrorToFailure(e));
    }
  }

  /// Get current user from storage
  Future<User?> getCurrentUser() async {
    try {
      final userData = await _secureStorage.read(key: ApiConfig.userKey);
      if (userData == null) return null;

      final userJson = jsonDecode(userData) as Map<String, dynamic>;
      return User.fromJson(userJson);
    } catch (e) {
      return null;
    }
  }

  /// Get current auth token
  Future<String?> getToken() async {
    try {
      return await _secureStorage.read(key: ApiConfig.tokenKey);
    } catch (e) {
      return null;
    }
  }

  /// Get current user from API
  Future<Either<Failure, User>> getMe() async {
    try {
      final response = await _dioClient.get('${ApiConfig.auth}/me');
      // Extract data from API wrapper: {success, data, message}
      final data = response.data['data'] as Map<String, dynamic>;
      return Right(User.fromJson(data));
    } catch (e) {
      return Left(_mapErrorToFailure(e));
    }
  }

  /// Update user profile
  Future<Either<Failure, User>> updateProfile(
    Map<String, dynamic> updates,
  ) async {
    try {
      final response = await _dioClient.put(
        '${ApiConfig.auth}/me',
        data: updates,
      );

      // Extract data from API wrapper: {success, data, message}
      final data = response.data['data'] as Map<String, dynamic>;
      final user = User.fromJson(data);

      // Update stored user data
      await _secureStorage.write(
        key: ApiConfig.userKey,
        value: jsonEncode(user.toJson()),
      );

      return Right(user);
    } catch (e) {
      return Left(_mapErrorToFailure(e));
    }
  }

  /// Check if user is authenticated
  Future<bool> isAuthenticated() async {
    final token = await getToken();
    return token != null;
  }

  /// Check username availability
  Future<Either<Failure, bool>> checkUsernameAvailability(
    String username,
  ) async {
    try {
      final response = await _dioClient.get(
        '${ApiConfig.auth}/check-username/$username',
      );
      final data = response.data['data'] as Map<String, dynamic>;
      return Right(data['available'] as bool);
    } catch (e) {
      return Left(_mapErrorToFailure(e));
    }
  }
}
