import 'package:dartz/dartz.dart';
import 'package:dio/dio.dart';

import '../../../core/api/dio_client.dart';
import '../../../core/error/failures.dart';

/// Wishlist API — mirrors `GET/POST/DELETE /api/wishlist`.
class WishlistRepository {
  WishlistRepository({required DioClient dioClient}) : _dioClient = dioClient;

  final DioClient _dioClient;

  Failure _mapError(Object e) {
    if (e is Failure) return e;
    if (e is DioException) return DioClient.handleDioError(e);
    return ServerFailure('Unexpected error: $e');
  }

  Future<Either<Failure, bool>> isWishlisted(String bandId) async {
    try {
      final response = await _dioClient.get(
        '/wishlist/status',
        queryParameters: {'bandId': bandId},
      );
      final data = response.data['data'] as Map<String, dynamic>?;
      return Right(data?['isWishlisted'] as bool? ?? false);
    } catch (e) {
      return Left(_mapError(e));
    }
  }

  Future<Either<Failure, void>> add(String bandId) async {
    try {
      await _dioClient.post('/wishlist', data: {'bandId': bandId});
      return const Right(null);
    } catch (e) {
      return Left(_mapError(e));
    }
  }

  Future<Either<Failure, void>> removeByBandId(String bandId) async {
    try {
      await _dioClient.delete('/wishlist', queryParameters: {'bandId': bandId});
      return const Right(null);
    } catch (e) {
      return Left(_mapError(e));
    }
  }
}
