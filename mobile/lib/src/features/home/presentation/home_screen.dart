import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/providers/providers.dart';
import '../../venues/domain/venue.dart';
import '../../bands/domain/band.dart';
import '../../../shared/widgets/venue_card.dart';
import '../../../shared/widgets/band_card.dart';

// Providers for popular content
final popularVenuesProvider = FutureProvider.autoDispose<List<Venue>>((ref) async {
  final repository = ref.watch(venueRepositoryProvider);
  return repository.getPopularVenues(limit: 5);
});

final popularBandsProvider = FutureProvider.autoDispose<List<Band>>((ref) async {
  final repository = ref.watch(bandRepositoryProvider);
  return repository.getPopularBands(limit: 5);
});

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authStateProvider);
    final popularVenues = ref.watch(popularVenuesProvider);
    final popularBands = ref.watch(popularBandsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('PitPulse'),
        actions: [
          IconButton(
            icon: const Icon(Icons.person),
            onPressed: () => context.push('/profile'),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(popularVenuesProvider);
          ref.invalidate(popularBandsProvider);
        },
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(AppTheme.spacing16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Welcome Section
              authState.when(
                data: (user) => user != null
                    ? Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Welcome back,',
                            style: Theme.of(context).textTheme.bodyLarge,
                          ),
                          Text(
                            user.username,
                            style: Theme.of(context)
                                .textTheme
                                .displaySmall
                                ?.copyWith(
                                  color: AppTheme.primary,
                                ),
                          ),
                          const SizedBox(height: AppTheme.spacing24),
                        ],
                      )
                    : const SizedBox.shrink(),
                loading: () => const SizedBox.shrink(),
                error: (_, __) => const SizedBox.shrink(),
              ),

              // Search Bar
              Card(
                child: ListTile(
                  leading: const Icon(Icons.search),
                  title: const Text('Search venues, bands...'),
                  onTap: () {
                    // TODO: Implement search
                  },
                ),
              ),
              const SizedBox(height: AppTheme.spacing24),

              // Popular Venues Section
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Popular Venues',
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                  TextButton(
                    onPressed: () => context.push('/venues'),
                    child: const Text('See All'),
                  ),
                ],
              ),
              const SizedBox(height: AppTheme.spacing8),

              popularVenues.when(
                data: (venues) => venues.isEmpty
                    ? const Center(
                        child: Padding(
                          padding: EdgeInsets.all(AppTheme.spacing24),
                          child: Text('No venues available'),
                        ),
                      )
                    : SizedBox(
                        height: 200,
                        child: ListView.builder(
                          scrollDirection: Axis.horizontal,
                          itemCount: venues.length,
                          itemBuilder: (context, index) {
                            return SizedBox(
                              width: 300,
                              child: VenueCard(
                                venue: venues[index],
                                onTap: () => context.push(
                                  '/venues/${venues[index].id}',
                                ),
                              ),
                            );
                          },
                        ),
                      ),
                loading: () => const Center(
                  child: Padding(
                    padding: EdgeInsets.all(AppTheme.spacing24),
                    child: CircularProgressIndicator(),
                  ),
                ),
                error: (error, _) => Center(
                  child: Padding(
                    padding: const EdgeInsets.all(AppTheme.spacing24),
                    child: Column(
                      children: [
                        Text(
                          'Could not load venues',
                          style: TextStyle(color: AppTheme.error),
                        ),
                        const SizedBox(height: AppTheme.spacing8),
                        TextButton.icon(
                          onPressed: () => ref.invalidate(popularVenuesProvider),
                          icon: const Icon(Icons.refresh),
                          label: const Text('Retry'),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(height: AppTheme.spacing24),

              // Popular Bands Section
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Popular Bands',
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                  TextButton(
                    onPressed: () => context.push('/bands'),
                    child: const Text('See All'),
                  ),
                ],
              ),
              const SizedBox(height: AppTheme.spacing8),

              popularBands.when(
                data: (bands) => bands.isEmpty
                    ? const Center(
                        child: Padding(
                          padding: EdgeInsets.all(AppTheme.spacing24),
                          child: Text('No bands available'),
                        ),
                      )
                    : SizedBox(
                        height: 200,
                        child: ListView.builder(
                          scrollDirection: Axis.horizontal,
                          itemCount: bands.length,
                          itemBuilder: (context, index) {
                            return SizedBox(
                              width: 300,
                              child: BandCard(
                                band: bands[index],
                                onTap: () => context.push(
                                  '/bands/${bands[index].id}',
                                ),
                              ),
                            );
                          },
                        ),
                      ),
                loading: () => const Center(
                  child: Padding(
                    padding: EdgeInsets.all(AppTheme.spacing24),
                    child: CircularProgressIndicator(),
                  ),
                ),
                error: (error, _) => Center(
                  child: Padding(
                    padding: const EdgeInsets.all(AppTheme.spacing24),
                    child: Column(
                      children: [
                        Text(
                          'Could not load bands',
                          style: TextStyle(color: AppTheme.error),
                        ),
                        const SizedBox(height: AppTheme.spacing8),
                        TextButton.icon(
                          onPressed: () => ref.invalidate(popularBandsProvider),
                          icon: const Icon(Icons.refresh),
                          label: const Text('Retry'),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: 0,
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.home),
            label: 'Home',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.location_on),
            label: 'Venues',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.music_note),
            label: 'Bands',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.person),
            label: 'Profile',
          ),
        ],
        onTap: (index) {
          switch (index) {
            case 0:
              // Already on home
              break;
            case 1:
              context.push('/venues');
              break;
            case 2:
              context.push('/bands');
              break;
            case 3:
              context.push('/profile');
              break;
          }
        },
      ),
    );
  }
}
