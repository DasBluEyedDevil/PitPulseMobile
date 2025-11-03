import '../../../core/api/dio_client.dart';
import '../../../core/api/api_config.dart';
import '../domain/review.dart';

class ReviewRepository {
  final DioClient _dioClient;

  ReviewRepository({required DioClient dioClient}) : _dioClient = dioClient;

  /// Get all reviews with optional filters
  Future<List<Review>> getReviews({
    String? venueId,
    String? bandId,
    String? userId,
    int page = 1,
    int limit = 20,
  }) async {
    try {
      final queryParams = <String, dynamic>{
        'page': page,
        'limit': limit,
      };

      if (venueId != null) queryParams['venueId'] = venueId;
      if (bandId != null) queryParams['bandId'] = bandId;
      if (userId != null) queryParams['userId'] = userId;

      final response = await _dioClient.get(
        ApiConfig.reviews,
        queryParameters: queryParams,
      );

      final List<dynamic> data = response.data;
      return data.map((json) => Review.fromJson(json)).toList();
    } catch (e) {
      rethrow;
    }
  }

  /// Get review by ID
  Future<Review> getReviewById(String id) async {
    try {
      final response = await _dioClient.get('${ApiConfig.reviews}/$id');
      return Review.fromJson(response.data);
    } catch (e) {
      rethrow;
    }
  }

  /// Create a new review
  Future<Review> createReview(CreateReviewRequest request) async {
    try {
      final response = await _dioClient.post(
        ApiConfig.reviews,
        data: request.toJson(),
      );
      return Review.fromJson(response.data);
    } catch (e) {
      rethrow;
    }
  }

  /// Update review
  Future<Review> updateReview(String id, Map<String, dynamic> updates) async {
    try {
      final response = await _dioClient.put(
        '${ApiConfig.reviews}/$id',
        data: updates,
      );
      return Review.fromJson(response.data);
    } catch (e) {
      rethrow;
    }
  }

  /// Delete review
  Future<void> deleteReview(String id) async {
    try {
      await _dioClient.delete('${ApiConfig.reviews}/$id');
    } catch (e) {
      rethrow;
    }
  }

  /// Mark review as helpful
  Future<void> markReviewHelpful(String id) async {
    try {
      await _dioClient.post('${ApiConfig.reviews}/$id/helpful');
    } catch (e) {
      rethrow;
    }
  }
}
