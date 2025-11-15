import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../core/theme/app_theme.dart';
import '../../features/bands/domain/band.dart';
import '../utils/haptic_feedback.dart';
import 'star_rating.dart';

class BandCard extends StatelessWidget {
  final Band band;
  final VoidCallback? onTap;

  const BandCard({
    required this.band, super.key,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      enabled: onTap != null,
      label: 'Band: ${band.name}${band.genre != null ? ', genre: ${band.genre}' : ''}, ${band.averageRating.toStringAsFixed(1)} star rating with ${band.totalReviews} reviews',
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
                child: band.imageUrl != null
                    ? CachedNetworkImage(
                        imageUrl: band.imageUrl!,
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
              ),
            ],
          ),
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
