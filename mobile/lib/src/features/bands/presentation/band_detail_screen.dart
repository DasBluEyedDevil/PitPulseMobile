import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/providers/providers.dart';
import '../domain/band.dart';
import '../../../shared/widgets/star_rating.dart';

final bandDetailProvider = FutureProvider.autoDispose.family<Band, String>((ref, id) async {
  final repository = ref.watch(bandRepositoryProvider);
  return repository.getBandById(id);
});

class BandDetailScreen extends ConsumerWidget {
  final String bandId;

  const BandDetailScreen({
    super.key,
    required this.bandId,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final bandAsync = ref.watch(bandDetailProvider(bandId));

    return Scaffold(
      body: bandAsync.when(
        data: (band) => CustomScrollView(
          slivers: [
            SliverAppBar(
              expandedHeight: 200,
              pinned: true,
              flexibleSpace: FlexibleSpaceBar(
                title: Text(band.name),
                background: band.imageUrl != null
                    ? Image.network(
                        band.imageUrl!,
                        fit: BoxFit.cover,
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
                      Text(
                        'Genre: ${band.genre}',
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                    ],
                    if (band.description != null) ...[
                      const SizedBox(height: AppTheme.spacing16),
                      Text(
                        band.description!,
                        style: Theme.of(context).textTheme.bodyLarge,
                      ),
                    ],
                    const SizedBox(height: AppTheme.spacing24),
                    ElevatedButton.icon(
                      onPressed: () {
                        final encodedId = Uri.encodeQueryComponent(bandId);
                        context.push('/add-review?bandId=$encodedId');
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
}
