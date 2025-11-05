import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/providers/providers.dart';
import '../../reviews/domain/review.dart';

final myReviewsProvider = FutureProvider.autoDispose<List<Review>>((ref) async {
  final reviewRepository = ref.watch(reviewRepositoryProvider);
  final user = ref.watch(authStateProvider).value;

  if (user == null) {
    return [];
  }

  return reviewRepository.getReviews(userId: user.id);
});

class MyReviewsScreen extends ConsumerWidget {
  const MyReviewsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final reviewsAsync = ref.watch(myReviewsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Reviews'),
      ),
      body: reviewsAsync.when(
        data: (reviews) {
          if (reviews.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.rate_review_outlined,
                    size: 80,
                    color: Colors.grey[400],
                  ),
                  const SizedBox(height: AppTheme.spacing16),
                  Text(
                    'No reviews yet',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          color: Colors.grey[600],
                        ),
                  ),
                  const SizedBox(height: AppTheme.spacing8),
                  Text(
                    'Start reviewing venues and bands!',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: Colors.grey[500],
                        ),
                  ),
                  const SizedBox(height: AppTheme.spacing24),
                  ElevatedButton.icon(
                    onPressed: () => context.go('/venues'),
                    icon: const Icon(Icons.add),
                    label: const Text('Add Review'),
                  ),
                ],
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(myReviewsProvider);
            },
            child: ListView.builder(
              padding: const EdgeInsets.all(AppTheme.spacing16),
              itemCount: reviews.length,
              itemBuilder: (context, index) {
                final review = reviews[index];
                return _ReviewCard(review: review);
              },
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text('Error loading reviews: $error'),
              const SizedBox(height: AppTheme.spacing16),
              ElevatedButton(
                onPressed: () => ref.invalidate(myReviewsProvider),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ReviewCard extends StatelessWidget {
  final Review review;

  const _ReviewCard({required this.review});

  @override
  Widget build(BuildContext context) {
    final dateFormat = DateFormat('MMM d, yyyy');
    final createdDate = DateTime.parse(review.createdAt);

    return Card(
      margin: const EdgeInsets.only(bottom: AppTheme.spacing16),
      child: InkWell(
        onTap: () {
          // Navigate to venue or band detail
          if (review.venueId != null) {
            context.push('/venues/${review.venueId}');
          } else if (review.bandId != null) {
            context.push('/bands/${review.bandId}');
          }
        },
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(AppTheme.spacing16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header: Rating and Date
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      const Icon(
                        Icons.star,
                        color: AppTheme.warning,
                        size: 20,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        review.rating.toStringAsFixed(1),
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                      ),
                    ],
                  ),
                  Text(
                    dateFormat.format(createdDate),
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Colors.grey[600],
                        ),
                  ),
                ],
              ),
              const SizedBox(height: AppTheme.spacing8),

              // Venue/Band Name
              if (review.venue != null)
                Row(
                  children: [
                    const Icon(Icons.location_on, size: 16, color: AppTheme.primary),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(
                        review.venue!.name,
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.w600,
                            ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                )
              else if (review.band != null)
                Row(
                  children: [
                    const Icon(Icons.music_note, size: 16, color: AppTheme.primary),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(
                        review.band!.name,
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.w600,
                            ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              const SizedBox(height: AppTheme.spacing8),

              // Review Title
              if (review.title != null && review.title!.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.only(bottom: AppTheme.spacing4),
                  child: Text(
                    review.title!,
                    style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                          fontWeight: FontWeight.w500,
                        ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),

              // Review Content
              if (review.content != null && review.content!.isNotEmpty)
                Text(
                  review.content!,
                  style: Theme.of(context).textTheme.bodyMedium,
                  maxLines: 3,
                  overflow: TextOverflow.ellipsis,
                ),

              // Footer: Helpful count and verified badge
              if (review.helpfulCount > 0 || review.isVerified)
                Padding(
                  padding: const EdgeInsets.only(top: AppTheme.spacing8),
                  child: Row(
                    children: [
                      if (review.helpfulCount > 0) ...[
                        Icon(
                          Icons.thumb_up_outlined,
                          size: 16,
                          color: Colors.grey[600],
                        ),
                        const SizedBox(width: 4),
                        Text(
                          '${review.helpfulCount}',
                          style:
                              Theme.of(context).textTheme.bodySmall?.copyWith(
                                    color: Colors.grey[600],
                                  ),
                        ),
                        const SizedBox(width: 16),
                      ],
                      if (review.isVerified) ...[
                        Icon(
                          Icons.verified,
                          size: 16,
                          color: Colors.green[600],
                        ),
                        const SizedBox(width: 4),
                        Text(
                          'Verified',
                          style:
                              Theme.of(context).textTheme.bodySmall?.copyWith(
                                    color: Colors.green[600],
                                  ),
                        ),
                      ],
                    ],
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
