import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/providers/providers.dart';
import '../domain/band.dart';
import '../../../shared/widgets/band_card.dart';

final bandsProvider = FutureProvider.autoDispose<List<Band>>((ref) async {
  final repository = ref.watch(bandRepositoryProvider);
  return repository.getBands();
});

class BandsScreen extends ConsumerWidget {
  const BandsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final bandsAsync = ref.watch(bandsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Bands'),
      ),
      body: bandsAsync.when(
        data: (bands) => RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(bandsProvider);
          },
          child: bands.isEmpty
              ? const Center(child: Text('No bands found'))
              : ListView.builder(
                  padding: const EdgeInsets.all(AppTheme.spacing16),
                  itemCount: bands.length,
                  itemBuilder: (context, index) {
                    return BandCard(
                      band: bands[index],
                      onTap: () => context.push('/bands/${bands[index].id}'),
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
                  'Could not load bands',
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
                  onPressed: () => ref.invalidate(bandsProvider),
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
