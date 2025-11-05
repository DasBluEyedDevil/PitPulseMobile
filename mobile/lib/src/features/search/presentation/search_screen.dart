import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';
import '../data/search_providers.dart';
import '../../../shared/widgets/venue_card.dart';
import '../../../shared/widgets/band_card.dart';

class SearchScreen extends ConsumerStatefulWidget {
  const SearchScreen({super.key});

  @override
  ConsumerState<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends ConsumerState<SearchScreen> {
  final TextEditingController _searchController = TextEditingController();
  Timer? _debounceTimer;

  @override
  void initState() {
    super.initState();
    _searchController.addListener(_onSearchChanged);
  }

  @override
  void dispose() {
    _searchController.dispose();
    _debounceTimer?.cancel();
    super.dispose();
  }

  void _onSearchChanged() {
    // Cancel previous timer
    _debounceTimer?.cancel();

    // Create new timer for debouncing (300ms delay)
    _debounceTimer = Timer(const Duration(milliseconds: 300), () {
      ref.read(searchQueryProvider.notifier).state = _searchController.text;
    });
  }

  @override
  Widget build(BuildContext context) {
    final searchResults = ref.watch(combinedSearchResultsProvider);
    final currentFilter = ref.watch(searchFilterProvider);
    final query = ref.watch(searchQueryProvider);

    return Scaffold(
      appBar: AppBar(
        title: TextField(
          controller: _searchController,
          autofocus: true,
          decoration: const InputDecoration(
            hintText: 'Search venues, bands...',
            border: InputBorder.none,
            hintStyle: TextStyle(color: Colors.white70),
          ),
          style: const TextStyle(color: Colors.white, fontSize: 18),
        ),
        actions: [
          if (_searchController.text.isNotEmpty)
            IconButton(
              icon: const Icon(Icons.clear),
              onPressed: () {
                _searchController.clear();
                ref.read(searchQueryProvider.notifier).state = '';
              },
            ),
        ],
      ),
      body: Column(
        children: [
          // Filter Chips
          Container(
            padding: const EdgeInsets.symmetric(
              horizontal: AppTheme.spacing16,
              vertical: AppTheme.spacing8,
            ),
            child: Row(
              children: [
                FilterChip(
                  label: const Text('All'),
                  selected: currentFilter == SearchFilter.all,
                  onSelected: (selected) {
                    if (selected) {
                      ref.read(searchFilterProvider.notifier).state =
                          SearchFilter.all;
                    }
                  },
                ),
                const SizedBox(width: AppTheme.spacing8),
                FilterChip(
                  label: const Text('Venues'),
                  selected: currentFilter == SearchFilter.venues,
                  onSelected: (selected) {
                    if (selected) {
                      ref.read(searchFilterProvider.notifier).state =
                          SearchFilter.venues;
                    }
                  },
                ),
                const SizedBox(width: AppTheme.spacing8),
                FilterChip(
                  label: const Text('Bands'),
                  selected: currentFilter == SearchFilter.bands,
                  onSelected: (selected) {
                    if (selected) {
                      ref.read(searchFilterProvider.notifier).state =
                          SearchFilter.bands;
                    }
                  },
                ),
              ],
            ),
          ),

          // Search Results
          Expanded(
            child: _buildSearchResults(context, query, searchResults),
          ),
        ],
      ),
    );
  }

  Widget _buildSearchResults(
    BuildContext context,
    String query,
    SearchResults results,
  ) {
    // Show initial state
    if (query.trim().isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.search,
              size: 64,
              color: Colors.grey[400],
            ),
            const SizedBox(height: AppTheme.spacing16),
            Text(
              'Start typing to search',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    color: Colors.grey[600],
                  ),
            ),
          ],
        ),
      );
    }

    // Show loading state
    if (results.isLoading) {
      return const Center(
        child: CircularProgressIndicator(),
      );
    }

    // Show error state
    if (results.error != null) {
      return Center(
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
                'Could not load search results',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: AppTheme.spacing8),
              Text(
                'Please check your connection and try again.',
                style: Theme.of(context).textTheme.bodyMedium,
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      );
    }

    // Show empty results
    if (results.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(AppTheme.spacing24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.search_off,
                size: 64,
                color: Colors.grey[400],
              ),
              const SizedBox(height: AppTheme.spacing16),
              Text(
                'No results found',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: AppTheme.spacing8),
              Text(
                'Try searching with different keywords',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: Colors.grey[600],
                    ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      );
    }

    // Show results
    return ListView(
      padding: const EdgeInsets.all(AppTheme.spacing16),
      children: [
        // Venues Section
        if (results.venues.isNotEmpty) ...[
          Padding(
            padding: const EdgeInsets.only(bottom: AppTheme.spacing8),
            child: Text(
              'Venues (${results.venues.length})',
              style: Theme.of(context).textTheme.titleLarge,
            ),
          ),
          ...results.venues.map((venue) => Padding(
                padding: const EdgeInsets.only(bottom: AppTheme.spacing8),
                child: VenueCard(
                  venue: venue,
                  onTap: () => context.push('/venues/${venue.id}'),
                ),
              )),
          const SizedBox(height: AppTheme.spacing16),
        ],

        // Bands Section
        if (results.bands.isNotEmpty) ...[
          Padding(
            padding: const EdgeInsets.only(bottom: AppTheme.spacing8),
            child: Text(
              'Bands (${results.bands.length})',
              style: Theme.of(context).textTheme.titleLarge,
            ),
          ),
          ...results.bands.map((band) => Padding(
                padding: const EdgeInsets.only(bottom: AppTheme.spacing8),
                child: BandCard(
                  band: band,
                  onTap: () => context.push('/bands/${band.id}'),
                ),
              )),
        ],
      ],
    );
  }
}
