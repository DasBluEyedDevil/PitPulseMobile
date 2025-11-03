import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/providers/providers.dart';
import '../domain/band.dart';
import '../../../shared/widgets/band_card.dart';

final bandsProvider = FutureProvider<List<Band>>((ref) async {
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
        error: (error, _) => Center(
          child: Text('Error: $error'),
        ),
      ),
    );
  }
}
