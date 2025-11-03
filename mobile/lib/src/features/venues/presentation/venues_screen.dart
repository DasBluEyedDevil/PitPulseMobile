import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/providers/providers.dart';
import '../domain/venue.dart';
import '../../../shared/widgets/venue_card.dart';

final venuesProvider = FutureProvider.autoDispose<List<Venue>>((ref) async {
  final repository = ref.watch(venueRepositoryProvider);
  return repository.getVenues();
});

class VenuesScreen extends ConsumerWidget {
  const VenuesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final venuesAsync = ref.watch(venuesProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Venues'),
      ),
      body: venuesAsync.when(
        data: (venues) => RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(venuesProvider);
          },
          child: venues.isEmpty
              ? const Center(child: Text('No venues found'))
              : ListView.builder(
                  padding: const EdgeInsets.all(AppTheme.spacing16),
                  itemCount: venues.length,
                  itemBuilder: (context, index) {
                    return VenueCard(
                      venue: venues[index],
                      onTap: () => context.push('/venues/${venues[index].id}'),
                    );
                  },
                ),
        ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stackTrace) => Center(
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
                Text(
                  'Could not load venues',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const SizedBox(height: AppTheme.spacing8),
                Text(
                  'Please check your connection and try again.',
                  style: Theme.of(context).textTheme.bodyMedium,
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: AppTheme.spacing24),
                ElevatedButton.icon(
                  onPressed: () => ref.invalidate(venuesProvider),
                  icon: const Icon(Icons.refresh),
                  label: const Text('Retry'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
