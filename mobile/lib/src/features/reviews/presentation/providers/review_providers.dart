import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/providers/providers.dart';
import '../../domain/review.dart';

/// Provider for fetching reviews for a specific venue
final venueReviewsProvider = FutureProvider.autoDispose.family<List<Review>, String>((ref, venueId) async {
  final repository = ref.watch(reviewRepositoryProvider);
  return repository.getReviews(venueId: venueId, limit: 5);
});

/// Provider for fetching reviews for a specific band
final bandReviewsProvider = FutureProvider.autoDispose.family<List<Review>, String>((ref, bandId) async {
  final repository = ref.watch(reviewRepositoryProvider);
  return repository.getReviews(bandId: bandId, limit: 5);
});

/// Provider for fetching all reviews for a venue (with pagination support)
final allVenueReviewsProvider = FutureProvider.autoDispose.family<List<Review>, VenueReviewsParams>((ref, params) async {
  final repository = ref.watch(reviewRepositoryProvider);
  return repository.getReviews(
    venueId: params.venueId,
    page: params.page,
    limit: params.limit,
  );
});

/// Provider for fetching all reviews for a band (with pagination support)
final allBandReviewsProvider = FutureProvider.autoDispose.family<List<Review>, BandReviewsParams>((ref, params) async {
  final repository = ref.watch(reviewRepositoryProvider);
  return repository.getReviews(
    bandId: params.bandId,
    page: params.page,
    limit: params.limit,
  );
});

/// Parameters for venue reviews pagination
class VenueReviewsParams {
  final String venueId;
  final int page;
  final int limit;

  VenueReviewsParams({
    required this.venueId,
    this.page = 1,
    this.limit = 20,
  });

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is VenueReviewsParams &&
        other.venueId == venueId &&
        other.page == page &&
        other.limit == limit;
  }

  @override
  int get hashCode => Object.hash(venueId, page, limit);
}

/// Parameters for band reviews pagination
class BandReviewsParams {
  final String bandId;
  final int page;
  final int limit;

  BandReviewsParams({
    required this.bandId,
    this.page = 1,
    this.limit = 20,
  });

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is BandReviewsParams &&
        other.bandId == bandId &&
        other.page == page &&
        other.limit == limit;
  }

  @override
  int get hashCode => Object.hash(bandId, page, limit);
}
