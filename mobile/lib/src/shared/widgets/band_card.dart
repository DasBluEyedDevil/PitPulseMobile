import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import '../../features/bands/domain/band.dart';
import 'star_rating.dart';

class BandCard extends StatelessWidget {
  final Band band;
  final VoidCallback? onTap;

  const BandCard({
    super.key,
    required this.band,
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
            band.imageUrl != null
                ? Image.network(
                    band.imageUrl!,
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
                    band.name,
                    style: Theme.of(context).textTheme.titleLarge,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (band.genre != null)
                    Padding(
                      padding: const EdgeInsets.only(top: AppTheme.spacing4),
                      child: Row(
                        children: [
                          const Icon(
                            Icons.music_note,
                            size: 16,
                            color: AppTheme.textSecondary,
                          ),
                          const SizedBox(width: AppTheme.spacing4),
                          Expanded(
                            child: Text(
                              band.genre!,
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
                      StarRating(rating: band.averageRating),
                      const SizedBox(width: AppTheme.spacing8),
                      Text(
                        '(${band.totalReviews})',
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
        Icons.music_video,
        size: 48,
        color: AppTheme.textSecondary,
      ),
    );
  }
}
