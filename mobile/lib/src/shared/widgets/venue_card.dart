import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../core/theme/app_theme.dart';
import '../../features/venues/domain/venue.dart';
import '../utils/haptic_feedback.dart';
import 'star_rating.dart';

class VenueCard extends StatelessWidget {
  final Venue venue;
  final VoidCallback? onTap;

  const VenueCard({
    super.key,
    required this.venue,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final location = [venue.city, venue.state]
        .where((e) => e != null)
        .join(', ');

    return Semantics(
      button: true,
      enabled: onTap != null,
      label: 'Venue: ${venue.name}${location.isNotEmpty ? ', located in $location' : ''}, ${venue.averageRating.toStringAsFixed(1)} star rating with ${venue.totalReviews} reviews',
      child: Card(
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap != null ? () async {
            await HapticFeedbackUtil.lightImpact();
            onTap!();
          } : null,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Image
              ExcludeSemantics(
                child: venue.imageUrl != null
                    ? CachedNetworkImage(
                        imageUrl: venue.imageUrl!,
                        height: 120,
                        width: double.infinity,
                        fit: BoxFit.cover,
                        placeholder: (context, url) => Container(
                          height: 120,
                          width: double.infinity,
                          color: AppTheme.background,
                          child: const Center(
                            child: SizedBox(
                              width: 24,
                              height: 24,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            ),
                          ),
                        ),
                        errorWidget: (context, url, error) => _buildPlaceholder(),
                      )
                    : _buildPlaceholder(),
              ),

            // Content
            ExcludeSemantics(
              child: Padding(
                padding: const EdgeInsets.all(AppTheme.spacing12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      venue.name,
                      style: Theme.of(context).textTheme.titleLarge,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    if (venue.city != null || venue.state != null)
                      Padding(
                        padding: const EdgeInsets.only(top: AppTheme.spacing4),
                        child: Row(
                          children: [
                            const Icon(
                              Icons.location_on_outlined,
                              size: 16,
                              color: AppTheme.textSecondary,
                            ),
                            const SizedBox(width: AppTheme.spacing4),
                            Expanded(
                              child: Text(
                                [venue.city, venue.state]
                                    .where((e) => e != null)
                                    .join(', '),
                                style: Theme.of(context).textTheme.bodySmall,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                      ),
                    const SizedBox(height: AppTheme.spacing8),
                    Row(
                      children: [
                        StarRating(rating: venue.averageRating),
                        const SizedBox(width: AppTheme.spacing8),
                        Text(
                          '(${venue.totalReviews})',
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPlaceholder() {
    return Container(
      height: 120,
      width: double.infinity,
      color: AppTheme.background,
      child: const Icon(
        Icons.location_city,
        size: 48,
        color: AppTheme.textSecondary,
      ),
    );
  }
}
