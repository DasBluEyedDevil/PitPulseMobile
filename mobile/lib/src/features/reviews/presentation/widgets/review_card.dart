import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../shared/widgets/star_rating.dart';
import '../../domain/review.dart';

/// ReviewCard displays a single review with user information, rating, and content
class ReviewCard extends StatelessWidget {
  final Review review;

  const ReviewCard({
    required this.review, super.key,
  });

  @override
  Widget build(BuildContext context) {
    final user = review.user;
    final dateTime = DateTime.parse(review.createdAt);
    final formattedDate = DateFormat('MMM dd, yyyy').format(dateTime);

    return Card(
      margin: const EdgeInsets.only(bottom: AppTheme.spacing12),
      child: Padding(
        padding: const EdgeInsets.all(AppTheme.spacing16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // User Info and Rating Row
            Row(
              children: [
                // User Avatar
                CircleAvatar(
                  radius: 20,
                  backgroundColor: AppTheme.primary.withOpacity(0.1),
                  backgroundImage: user?.profileImageUrl != null
                      ? NetworkImage(user!.profileImageUrl!)
                      : null,
                  child: user?.profileImageUrl == null
                      ? Text(
                          _getInitials(user?.username ?? 'U'),
                          style: const TextStyle(
                            color: AppTheme.primary,
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                          ),
                        )
                      : null,
                ),
                const SizedBox(width: AppTheme.spacing12),
                // User Info
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Text(
                            user?.username ?? 'Anonymous',
                            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                  fontWeight: FontWeight.bold,
                                ),
                          ),
                          if (review.isVerified) ...[
                            const SizedBox(width: AppTheme.spacing4),
                            const Icon(
                              Icons.verified,
                              size: 16,
                              color: AppTheme.primary,
                            ),
                          ],
                        ],
                      ),
                      Text(
                        formattedDate,
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ],
                  ),
                ),
                // Rating
                StarRating(rating: review.rating, size: 18),
              ],
            ),
            const SizedBox(height: AppTheme.spacing12),

            // Review Title
            if (review.title != null && review.title!.isNotEmpty) ...[
              Text(
                review.title!,
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
              ),
              const SizedBox(height: AppTheme.spacing8),
            ],

            // Review Content
            if (review.content != null && review.content!.isNotEmpty) ...[
              Text(
                review.content!,
                style: Theme.of(context).textTheme.bodyMedium,
              ),
              const SizedBox(height: AppTheme.spacing12),
            ],

            // Event Date
            if (review.eventDate != null) ...[
              Row(
                children: [
                  const Icon(
                    Icons.calendar_today,
                    size: 14,
                    color: AppTheme.textSecondary,
                  ),
                  const SizedBox(width: AppTheme.spacing4),
                  Text(
                    'Event: ${DateFormat('MMM dd, yyyy').format(DateTime.parse(review.eventDate!))}',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ],
              ),
              const SizedBox(height: AppTheme.spacing8),
            ],

            // Review Images
            if (review.imageUrls != null && review.imageUrls!.isNotEmpty) ...[
              const SizedBox(height: AppTheme.spacing8),
              SizedBox(
                height: 80,
                child: ListView.builder(
                  scrollDirection: Axis.horizontal,
                  itemCount: review.imageUrls!.length,
                  itemBuilder: (context, index) {
                    return Padding(
                      padding: const EdgeInsets.only(right: AppTheme.spacing8),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
                        child: CachedNetworkImage(
                          imageUrl: review.imageUrls![index],
                          width: 80,
                          height: 80,
                          fit: BoxFit.cover,
                          placeholder: (context, url) => Container(
                            width: 80,
                            height: 80,
                            color: AppTheme.background,
                            child: const Center(
                              child: SizedBox(
                                width: 16,
                                height: 16,
                                child: CircularProgressIndicator(strokeWidth: 2),
                              ),
                            ),
                          ),
                          errorWidget: (context, url, error) => Container(
                            width: 80,
                            height: 80,
                            color: AppTheme.background,
                            child: const Icon(
                              Icons.broken_image,
                              color: AppTheme.textSecondary,
                            ),
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ),
              const SizedBox(height: AppTheme.spacing8),
            ],

            // Helpful Count
            if (review.helpfulCount > 0) ...[
              Row(
                children: [
                  const Icon(
                    Icons.thumb_up,
                    size: 14,
                    color: AppTheme.textSecondary,
                  ),
                  const SizedBox(width: AppTheme.spacing4),
                  Text(
                    '${review.helpfulCount} ${review.helpfulCount == 1 ? 'person' : 'people'} found this helpful',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }

  String _getInitials(String name) {
    final parts = name.trim().split(' ');
    if (parts.isEmpty) return 'U';
    if (parts.length == 1) {
      return parts[0].isNotEmpty ? parts[0][0].toUpperCase() : 'U';
    }
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
}
