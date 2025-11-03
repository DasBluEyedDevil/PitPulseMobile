import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/providers/providers.dart';
import '../domain/venue.dart';
import '../../../shared/widgets/star_rating.dart';

final venueDetailProvider = FutureProvider.family<Venue, String>((ref, id) async {
  final repository = ref.watch(venueRepositoryProvider);
  return repository.getVenueById(id);
});

class VenueDetailScreen extends ConsumerWidget {
  final String venueId;

  const VenueDetailScreen({
    super.key,
    required this.venueId,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final venueAsync = ref.watch(venueDetailProvider(venueId));

    return Scaffold(
      body: venueAsync.when(
        data: (venue) => CustomScrollView(
          slivers: [
            SliverAppBar(
              expandedHeight: 200,
              pinned: true,
              flexibleSpace: FlexibleSpaceBar(
                title: Text(venue.name),
                background: venue.imageUrl != null
                    ? Image.network(
                        venue.imageUrl!,
                        fit: BoxFit.cover,
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
                    const SizedBox(height: AppTheme.spacing24),
                    ElevatedButton.icon(
                      onPressed: () {
                        context.push('/add-review?venueId=$venueId');
                      },
                      icon: const Icon(Icons.rate_review),
                      label: const Text('Write a Review'),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(child: Text('Error: $error')),
      ),
    );
  }
}
