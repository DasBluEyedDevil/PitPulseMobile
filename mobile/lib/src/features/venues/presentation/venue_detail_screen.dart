import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/providers/providers.dart';
import '../domain/venue.dart';
import '../../../shared/widgets/star_rating.dart';
import '../../reviews/presentation/providers/review_providers.dart';
import '../../reviews/presentation/widgets/review_card.dart';

final venueDetailProvider = FutureProvider.autoDispose.family<Venue, String>((ref, id) async {
  final repository = ref.watch(venueRepositoryProvider);
  return repository.getVenueById(id);
});

class VenueDetailScreen extends ConsumerWidget {
  final String venueId;

  const VenueDetailScreen({
    required this.venueId, super.key,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final venueAsync = ref.watch(venueDetailProvider(venueId));
    final reviewsAsync = ref.watch(venueReviewsProvider(venueId));

    return Scaffold(
      body: venueAsync.when(
        data: (venue) => RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(venueDetailProvider(venueId));
            ref.invalidate(venueReviewsProvider(venueId));
          },
          child: CustomScrollView(
          slivers: [
            SliverAppBar(
              expandedHeight: 200,
              pinned: true,
              flexibleSpace: FlexibleSpaceBar(
                title: Text(venue.name),
                background: venue.imageUrl != null
                    ? CachedNetworkImage(
                        imageUrl: venue.imageUrl!,
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
                            Icons.location_city,
                            size: 64,
                          ),
                        ),
                      )
                    : Container(
                        color: AppTheme.background,
                        child: const Icon(
                          Icons.location_city,
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
                        StarRating(rating: venue.averageRating, size: 24),
                        const SizedBox(width: AppTheme.spacing8),
                        Text(
                          '${venue.averageRating.toStringAsFixed(1)} (${venue.totalReviews} reviews)',
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                      ],
                    ),
                    if (venue.description != null) ...[
                      const SizedBox(height: AppTheme.spacing16),
                      Text(
                        venue.description!,
                        style: Theme.of(context).textTheme.bodyLarge,
                      ),
                    ],

                    // Venue Details Section
                    const SizedBox(height: AppTheme.spacing24),
                    Text(
                      'Venue Details',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: AppTheme.spacing16),

                    // Venue Type and Capacity
                    if (venue.venueType != null || venue.capacity != null) ...[
                      Row(
                        children: [
                          if (venue.venueType != null) ...[
                            const Icon(Icons.category, size: 20),
                            const SizedBox(width: AppTheme.spacing8),
                            Text(
                              _getVenueTypeLabel(venue.venueType!),
                              style: Theme.of(context).textTheme.bodyLarge,
                            ),
                          ],
                          if (venue.venueType != null && venue.capacity != null)
                            const SizedBox(width: AppTheme.spacing16),
                          if (venue.capacity != null) ...[
                            const Icon(Icons.people, size: 20),
                            const SizedBox(width: AppTheme.spacing8),
                            Text(
                              'Capacity: ${venue.capacity}',
                              style: Theme.of(context).textTheme.bodyLarge,
                            ),
                          ],
                        ],
                      ),
                      const SizedBox(height: AppTheme.spacing12),
                    ],

                    // Address
                    if (venue.address != null || venue.city != null) ...[
                      InkWell(
                        onTap: () => _openInMaps(venue),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Icon(Icons.location_on, size: 20),
                            const SizedBox(width: AppTheme.spacing8),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    _formatAddress(venue),
                                    style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                                      decoration: TextDecoration.underline,
                                      color: Theme.of(context).colorScheme.primary,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    'Tap to open in maps',
                                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                      color: Colors.grey,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: AppTheme.spacing12),
                    ],

                    // Contact Information Section
                    if (venue.phone != null || venue.email != null || venue.websiteUrl != null) ...[
                      const SizedBox(height: AppTheme.spacing16),
                      Text(
                        'Contact',
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: AppTheme.spacing16),

                      // Phone
                      if (venue.phone != null) ...[
                        InkWell(
                          onTap: () => _launchPhone(venue.phone!),
                          child: Row(
                            children: [
                              const Icon(Icons.phone, size: 20),
                              const SizedBox(width: AppTheme.spacing8),
                              Text(
                                venue.phone!,
                                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                                  decoration: TextDecoration.underline,
                                  color: Theme.of(context).colorScheme.primary,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: AppTheme.spacing12),
                      ],

                      // Email
                      if (venue.email != null) ...[
                        InkWell(
                          onTap: () => _launchEmail(venue.email!),
                          child: Row(
                            children: [
                              const Icon(Icons.email, size: 20),
                              const SizedBox(width: AppTheme.spacing8),
                              Text(
                                venue.email!,
                                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                                  decoration: TextDecoration.underline,
                                  color: Theme.of(context).colorScheme.primary,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: AppTheme.spacing12),
                      ],

                      // Website
                      if (venue.websiteUrl != null) ...[
                        InkWell(
                          onTap: () => _launchUrl(venue.websiteUrl!),
                          child: Row(
                            children: [
                              const Icon(Icons.language, size: 20),
                              const SizedBox(width: AppTheme.spacing8),
                              Expanded(
                                child: Text(
                                  venue.websiteUrl!,
                                  style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                                    decoration: TextDecoration.underline,
                                    color: Theme.of(context).colorScheme.primary,
                                  ),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ],

                    const SizedBox(height: AppTheme.spacing24),
                    ElevatedButton.icon(
                      onPressed: () async {
                        final encodedId = Uri.encodeQueryComponent(venueId);
                        await context.push('/add-review?venueId=$encodedId');
                        // Refresh reviews after returning from add review screen
                        ref.invalidate(venueReviewsProvider(venueId));
                        ref.invalidate(venueDetailProvider(venueId));
                      },
                      icon: const Icon(Icons.rate_review),
                      label: const Text('Write a Review'),
                    ),

                    // Reviews Section
                    const SizedBox(height: AppTheme.spacing32),
                    _buildReviewsSection(context, ref, venue.totalReviews, reviewsAsync),
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
            title: const Text('Venue Details'),
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
                    'Could not load venue details',
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
                    onPressed: () => ref.invalidate(venueDetailProvider(venueId)),
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

  String _formatAddress(Venue venue) {
    final parts = <String>[];
    if (venue.address != null) parts.add(venue.address!);
    if (venue.city != null) parts.add(venue.city!);
    if (venue.state != null) parts.add(venue.state!);
    if (venue.postalCode != null) parts.add(venue.postalCode!);
    if (venue.country != null) parts.add(venue.country!);
    return parts.join(', ');
  }

  String _getVenueTypeLabel(VenueType type) {
    switch (type) {
      case VenueType.concertHall:
        return 'Concert Hall';
      case VenueType.club:
        return 'Club';
      case VenueType.arena:
        return 'Arena';
      case VenueType.outdoor:
        return 'Outdoor';
      case VenueType.bar:
        return 'Bar';
      case VenueType.theater:
        return 'Theater';
      case VenueType.stadium:
        return 'Stadium';
      case VenueType.other:
        return 'Other';
    }
  }

  Future<void> _openInMaps(Venue venue) async {
    if (venue.latitude != null && venue.longitude != null) {
      final uri = Uri.parse(
        'https://www.google.com/maps/search/?api=1&query=${venue.latitude},${venue.longitude}',
      );
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      }
    } else if (venue.address != null) {
      final address = _formatAddress(venue);
      final uri = Uri.parse(
        'https://www.google.com/maps/search/?api=1&query=${Uri.encodeComponent(address)}',
      );
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      }
    }
  }

  Future<void> _launchUrl(String url) async {
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  Future<void> _launchPhone(String phone) async {
    final uri = Uri.parse('tel:$phone');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    }
  }

  Future<void> _launchEmail(String email) async {
    final uri = Uri.parse('mailto:$email');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
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
                  context.push('/reviews/venue/$venueId');
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
              onPressed: () => ref.invalidate(venueReviewsProvider(venueId)),
              icon: const Icon(Icons.refresh),
              label: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }
}
