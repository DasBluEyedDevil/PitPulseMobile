import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/providers/providers.dart';
import '../../venues/domain/venue.dart';
import '../../bands/domain/band.dart';

/// Search query state provider
final searchQueryProvider = StateProvider<String>((ref) => '');

/// Search filter type provider
enum SearchFilter { all, venues, bands }

final searchFilterProvider = StateProvider<SearchFilter>((ref) => SearchFilter.all);

/// Search results for venues
final venueSearchProvider = FutureProvider.autoDispose<List<Venue>>((ref) async {
  final query = ref.watch(searchQueryProvider);
  final filter = ref.watch(searchFilterProvider);

  // Don't search if query is empty or filter is bands only
  if (query.trim().isEmpty || filter == SearchFilter.bands) {
    return [];
  }

  final repository = ref.watch(venueRepositoryProvider);
  return repository.getVenues(search: query, limit: 50);
});

/// Search results for bands
final bandSearchProvider = FutureProvider.autoDispose<List<Band>>((ref) async {
  final query = ref.watch(searchQueryProvider);
  final filter = ref.watch(searchFilterProvider);

  // Don't search if query is empty or filter is venues only
  if (query.trim().isEmpty || filter == SearchFilter.venues) {
    return [];
  }

  final repository = ref.watch(bandRepositoryProvider);
  return repository.getBands(search: query, limit: 50);
});

/// Combined search results
class SearchResults {
  final List<Venue> venues;
  final List<Band> bands;
  final bool isLoading;
  final Object? error;

  SearchResults({
    required this.venues,
    required this.bands,
    this.isLoading = false,
    this.error,
  });

  bool get isEmpty => venues.isEmpty && bands.isEmpty;
  int get totalCount => venues.length + bands.length;
}

final combinedSearchResultsProvider = Provider.autoDispose<SearchResults>((ref) {
  final venueResults = ref.watch(venueSearchProvider);
  final bandResults = ref.watch(bandSearchProvider);

  final isLoading = venueResults.isLoading || bandResults.isLoading;
  final hasError = venueResults.hasError || bandResults.hasError;

  return SearchResults(
    venues: venueResults.valueOrNull ?? [],
    bands: bandResults.valueOrNull ?? [],
    isLoading: isLoading,
    error: hasError ? (venueResults.error ?? bandResults.error) : null,
  );
});
