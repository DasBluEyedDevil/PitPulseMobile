import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/providers/providers.dart';
import '../domain/venue.dart';
import '../../../shared/widgets/venue_card.dart';

final venuesProvider = FutureProvider<List<Venue>>((ref) async {
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
        error: (error, _) => Center(
          child: Text('Error: $error'),
        ),
      ),
    );
  }
}
