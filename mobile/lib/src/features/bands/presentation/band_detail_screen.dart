import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/providers/providers.dart';
import '../domain/band.dart';
import '../../../shared/widgets/star_rating.dart';
import '../../reviews/presentation/providers/review_providers.dart';
import '../../reviews/presentation/widgets/review_card.dart';

final bandDetailProvider = FutureProvider.autoDispose.family<Band, String>((ref, id) async {
  final repository = ref.watch(bandRepositoryProvider);
  return repository.getBandById(id);
});

class BandDetailScreen extends ConsumerWidget {
  final String bandId;

  const BandDetailScreen({
    required this.bandId, super.key,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final bandAsync = ref.watch(bandDetailProvider(bandId));
    final reviewsAsync = ref.watch(bandReviewsProvider(bandId));

    return Scaffold(
      body: bandAsync.when(
        data: (band) => RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(bandDetailProvider(bandId));
            ref.invalidate(bandReviewsProvider(bandId));
          },
          child: CustomScrollView(
          slivers: [
            SliverAppBar(
              expandedHeight: 200,
              pinned: true,
              flexibleSpace: FlexibleSpaceBar(
                title: Text(band.name),
                background: band.imageUrl != null
                    ? CachedNetworkImage(
                        imageUrl: band.imageUrl!,
                        fit: BoxFit.cover,
                        placeholder: (context, url) => Container(
                          color: AppTheme.background,
                          child: const Center(
                            child: CircularProgressIndicator(),
                          ),
                        ),
                        errorWidget: (context, url, error) => Container(
                          color: AppTheme.background,
                          child: const Icon(
                            Icons.music_video,
                            size: 64,
                          ),
                        ),
                      )
                    : Container(
                        color: AppTheme.background,
                        child: const Icon(
                          Icons.music_video,
                          size: 64,
                        ),
                      ),
              ),
            ),
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.all(AppTheme.spacing16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        StarRating(rating: band.averageRating, size: 24),
                        const SizedBox(width: AppTheme.spacing8),
                        Text(
                          '${band.averageRating.toStringAsFixed(1)} (${band.totalReviews} reviews)',
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                      ],
                    ),
                    if (band.genre != null) ...[
                      const SizedBox(height: AppTheme.spacing16),
                      Row(
                        children: [
                          const Icon(Icons.music_note, size: 20),
                          const SizedBox(width: AppTheme.spacing8),
                          Text(
                            'Genre: ${band.genre}',
                            style: Theme.of(context).textTheme.titleMedium,
                          ),
                        ],
                      ),
                    ],

                    // Band Details Section
                    if (band.formedYear != null || band.hometown != null) ...[
                      const SizedBox(height: AppTheme.spacing16),
                      if (band.formedYear != null) ...[
                        Row(
                          children: [
                            const Icon(Icons.calendar_today, size: 20),
                            const SizedBox(width: AppTheme.spacing8),
                            Text(
                              'Formed: ${band.formedYear}',
                              style: Theme.of(context).textTheme.bodyLarge,
                            ),
                          ],
                        ),
                      ],
                      if (band.hometown != null) ...[
                        const SizedBox(height: AppTheme.spacing12),
                        Row(
                          children: [
                            const Icon(Icons.location_city, size: 20),
                            const SizedBox(width: AppTheme.spacing8),
                            Text(
                              'From: ${band.hometown}',
                              style: Theme.of(context).textTheme.bodyLarge,
                            ),
                          ],
                        ),
                      ],
                    ],

                    if (band.description != null) ...[
                      const SizedBox(height: AppTheme.spacing16),
                      Text(
                        band.description!,
                        style: Theme.of(context).textTheme.bodyLarge,
                      ),
                    ],

                    // Social Media Section
                    if (band.spotifyUrl != null ||
                        band.instagramUrl != null ||
                        band.facebookUrl != null ||
                        band.websiteUrl != null) ...[
                      const SizedBox(height: AppTheme.spacing24),
                      Text(
                        'Connect',
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: AppTheme.spacing16),
                      Wrap(
                        spacing: AppTheme.spacing16,
                        runSpacing: AppTheme.spacing16,
                        children: [
                          if (band.spotifyUrl != null)
                            _SocialMediaButton(
                              icon: Icons.audiotrack,
                              label: 'Spotify',
                              color: const Color(0xFF1DB954),
                              onTap: () => _launchUrl(band.spotifyUrl!),
                            ),
                          if (band.instagramUrl != null)
                            _SocialMediaButton(
                              icon: Icons.camera_alt,
                              label: 'Instagram',
                              color: const Color(0xFFE4405F),
                              onTap: () => _launchUrl(band.instagramUrl!),
                            ),
                          if (band.facebookUrl != null)
                            _SocialMediaButton(
                              icon: Icons.facebook,
                              label: 'Facebook',
                              color: const Color(0xFF1877F2),
                              onTap: () => _launchUrl(band.facebookUrl!),
                            ),
                          if (band.websiteUrl != null)
                            _SocialMediaButton(
                              icon: Icons.language,
                              label: 'Website',
                              color: Theme.of(context).colorScheme.primary,
                              onTap: () => _launchUrl(band.websiteUrl!),
                            ),
                        ],
                      ),
                    ],

                    const SizedBox(height: AppTheme.spacing24),
                    ElevatedButton.icon(
                      onPressed: () async {
                        final encodedId = Uri.encodeQueryComponent(bandId);
                        await context.push('/add-review?bandId=$encodedId');
                        // Refresh reviews after returning from add review screen
                        ref.invalidate(bandReviewsProvider(bandId));
                        ref.invalidate(bandDetailProvider(bandId));
                      },
                      icon: const Icon(Icons.rate_review),
                      label: const Text('Write a Review'),
                    ),

                    // Reviews Section
                    const SizedBox(height: AppTheme.spacing32),
                    _buildReviewsSection(context, ref, band.totalReviews, reviewsAsync),
                  ],
                ),
              ),
            ),
          ],
        ),
        ),
        loading: () => const Scaffold(
          body: Center(child: CircularProgressIndicator()),
        ),
        error: (error, _) => Scaffold(
          appBar: AppBar(
            title: const Text('Band Details'),
          ),
          body: Center(
            child: Padding(
              padding: const EdgeInsets.all(AppTheme.spacing24),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(
                    Icons.error_outline,
                    size: 64,
                    color: AppTheme.error,
                  ),
                  const SizedBox(height: AppTheme.spacing16),
                  const Text(
                    'Could not load band details',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: AppTheme.spacing8),
                  const Text(
                    'Please check your connection and try again.',
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: AppTheme.spacing24),
                  ElevatedButton.icon(
                    onPressed: () => ref.invalidate(bandDetailProvider(bandId)),
                    icon: const Icon(Icons.refresh),
                    label: const Text('Retry'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _launchUrl(String url) async {
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  Widget _buildReviewsSection(BuildContext context, WidgetRef ref, int totalReviews, AsyncValue reviewsAsync) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Reviews',
              style: Theme.of(context).textTheme.headlineMedium,
            ),
            if (totalReviews > 5)
              TextButton(
                onPressed: () {
                  context.push('/reviews/band/$bandId');
                },
                child: const Text('See All'),
              ),
          ],
        ),
        const SizedBox(height: AppTheme.spacing16),
        reviewsAsync.when(
          data: (reviews) {
            if (reviews.isEmpty) {
              return _buildEmptyState(context);
            }
            return Column(
              children: reviews.map((review) => ReviewCard(review: review)).toList(),
            );
          },
          loading: () => const Center(
            child: Padding(
              padding: EdgeInsets.all(AppTheme.spacing24),
              child: CircularProgressIndicator(),
            ),
          ),
          error: (error, _) => _buildErrorState(context, ref),
        ),
      ],
    );
  }

  Widget _buildEmptyState(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppTheme.spacing32),
        child: Column(
          children: [
            Icon(
              Icons.rate_review_outlined,
              size: 64,
              color: Colors.grey[400],
            ),
            const SizedBox(height: AppTheme.spacing16),
            Text(
              'No reviews yet',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    color: AppTheme.textSecondary,
                  ),
            ),
            const SizedBox(height: AppTheme.spacing8),
            Text(
              'Be the first to write a review!',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: AppTheme.textSecondary,
                  ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildErrorState(BuildContext context, WidgetRef ref) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppTheme.spacing24),
        child: Column(
          children: [
            const Icon(
              Icons.error_outline,
              size: 48,
              color: AppTheme.error,
            ),
            const SizedBox(height: AppTheme.spacing16),
            const Text(
              'Could not load reviews',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: AppTheme.spacing8),
            TextButton.icon(
              onPressed: () => ref.invalidate(bandReviewsProvider(bandId)),
              icon: const Icon(Icons.refresh),
              label: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }
}

class _SocialMediaButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _SocialMediaButton({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(
          horizontal: AppTheme.spacing16,
          vertical: AppTheme.spacing12,
        ),
        decoration: BoxDecoration(
          color: color.withOpacity(0.1),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color, width: 1.5),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: color, size: 20),
            const SizedBox(width: AppTheme.spacing8),
            Text(
              label,
              style: TextStyle(
                color: color,
                fontWeight: FontWeight.bold,
                fontSize: 14,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
