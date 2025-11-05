import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/providers/providers.dart';
import '../../../shared/utils/haptic_feedback.dart';
import '../../venues/domain/venue.dart';
import '../../bands/domain/band.dart';
import '../../../shared/widgets/venue_card.dart';
import '../../../shared/widgets/band_card.dart';
import '../../../shared/widgets/venue_card_skeleton.dart';
import '../../../shared/widgets/band_card_skeleton.dart';
import '../../../shared/widgets/empty_state_widget.dart';
import '../../../shared/widgets/error_state_widget.dart';

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
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          await HapticFeedbackUtil.mediumImpact();
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
              Semantics(
                label: 'Search button for venues and bands',
                button: true,
                child: Card(
                  child: ListTile(
                    leading: const Icon(Icons.search),
                    title: const Text('Search venues, bands...'),
                    onTap: () async {
                      await HapticFeedbackUtil.lightImpact();
                      if (context.mounted) {
                        context.push('/search');
                      }
                    },
                  ),
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
                  Semantics(
                    label: 'See all venues button',
                    button: true,
                    child: TextButton(
                      onPressed: () async {
                        await HapticFeedbackUtil.lightImpact();
                        if (context.mounted) {
                          context.go('/venues');
                        }
                      },
                      child: const Text('See All'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: AppTheme.spacing8),

              popularVenues.when(
                data: (venues) => venues.isEmpty
                    ? Padding(
                        padding: const EdgeInsets.symmetric(vertical: AppTheme.spacing16),
                        child: Text(
                          'No popular venues at the moment',
                          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: AppTheme.textSecondary,
                          ),
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
                loading: () => SizedBox(
                  height: 200,
                  child: ListView.builder(
                    scrollDirection: Axis.horizontal,
                    itemCount: 3,
                    itemBuilder: (context, index) {
                      return const SizedBox(
                        width: 300,
                        child: VenueCardSkeleton(),
                      );
                    },
                  ),
                ),
                error: (error, stackTrace) => Padding(
                  padding: const EdgeInsets.symmetric(vertical: AppTheme.spacing16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Could not load venues',
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: AppTheme.error,
                        ),
                      ),
                      const SizedBox(height: AppTheme.spacing8),
                      Semantics(
                        label: 'Retry loading venues',
                        button: true,
                        child: TextButton.icon(
                          onPressed: () async {
                            await HapticFeedbackUtil.lightImpact();
                            ref.invalidate(popularVenuesProvider);
                          },
                          icon: const Icon(Icons.refresh),
                          label: const Text('Retry'),
                        ),
                      ),
                    ],
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
                  Semantics(
                    label: 'See all bands button',
                    button: true,
                    child: TextButton(
                      onPressed: () async {
                        await HapticFeedbackUtil.lightImpact();
                        if (context.mounted) {
                          context.go('/bands');
                        }
                      },
                      child: const Text('See All'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: AppTheme.spacing8),

              popularBands.when(
                data: (bands) => bands.isEmpty
                    ? Padding(
                        padding: const EdgeInsets.symmetric(vertical: AppTheme.spacing16),
                        child: Text(
                          'No popular bands at the moment',
                          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: AppTheme.textSecondary,
                          ),
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
                loading: () => SizedBox(
                  height: 200,
                  child: ListView.builder(
                    scrollDirection: Axis.horizontal,
                    itemCount: 3,
                    itemBuilder: (context, index) {
                      return const SizedBox(
                        width: 300,
                        child: BandCardSkeleton(),
                      );
                    },
                  ),
                ),
                error: (error, stackTrace) => Padding(
                  padding: const EdgeInsets.symmetric(vertical: AppTheme.spacing16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Could not load bands',
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: AppTheme.error,
                        ),
                      ),
                      const SizedBox(height: AppTheme.spacing8),
                      Semantics(
                        label: 'Retry loading bands',
                        button: true,
                        child: TextButton.icon(
                          onPressed: () async {
                            await HapticFeedbackUtil.lightImpact();
                            ref.invalidate(popularBandsProvider);
                          },
                          icon: const Icon(Icons.refresh),
                          label: const Text('Retry'),
                        ),
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
}
