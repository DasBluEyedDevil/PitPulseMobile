import 'package:freezed_annotation/freezed_annotation.dart';
import '../../auth/domain/user.dart';
import '../../venues/domain/venue.dart';
import '../../bands/domain/band.dart';

part 'review.freezed.dart';
part 'review.g.dart';

@freezed
class Review with _$Review {
  const factory Review({
    required String id,
    required String userId,
    required double rating, required bool isVerified, required int helpfulCount, required String createdAt, required String updatedAt, String? venueId,
    String? bandId,
    String? title,
    String? content,
    String? eventDate,
    List<String>? imageUrls,
    // Populated fields
    User? user,
    Venue? venue,
    Band? band,
  }) = _Review;

  factory Review.fromJson(Map<String, dynamic> json) =>
      _$ReviewFromJson(json);
}

@freezed
class CreateReviewRequest with _$CreateReviewRequest {
  const factory CreateReviewRequest({
    required double rating, String? venueId,
    String? bandId,
    String? title,
    String? content,
    String? eventDate,
    List<String>? imageUrls,
  }) = _CreateReviewRequest;

  factory CreateReviewRequest.fromJson(Map<String, dynamic> json) =>
      _$CreateReviewRequestFromJson(json);
}
