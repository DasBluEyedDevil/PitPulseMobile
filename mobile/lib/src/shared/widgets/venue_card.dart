import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import '../../features/venues/domain/venue.dart';
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
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Image
            venue.imageUrl != null
                ? Image.network(
                    venue.imageUrl!,
                    height: 120,
                    width: double.infinity,
                    fit: BoxFit.cover,
                    errorBuilder: (context, error, stackTrace) {
                      return _buildPlaceholder();
                    },
                  )
                : _buildPlaceholder(),

            // Content
            Padding(
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
