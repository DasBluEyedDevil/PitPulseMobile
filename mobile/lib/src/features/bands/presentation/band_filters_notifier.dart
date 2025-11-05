import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'band_filters_state.dart';

/// StateNotifier for managing band filters
class BandFiltersNotifier extends StateNotifier<BandFiltersState> {
  BandFiltersNotifier() : super(const BandFiltersState());

  /// Toggle genre filter
  void toggleGenre(String genre) {
    final genres = List<String>.from(state.genres);
    if (genres.contains(genre)) {
      genres.remove(genre);
    } else {
      genres.add(genre);
    }
    state = state.copyWith(genres: genres);
  }

  /// Set genres
  void setGenres(List<String> genres) {
    state = state.copyWith(genres: genres);
  }

  /// Toggle hometown filter
  void toggleHometown(String hometown) {
    final hometowns = List<String>.from(state.hometowns);
    if (hometowns.contains(hometown)) {
      hometowns.remove(hometown);
    } else {
      hometowns.add(hometown);
    }
    state = state.copyWith(hometowns: hometowns);
  }

  /// Set hometowns
  void setHometowns(List<String> hometowns) {
    state = state.copyWith(hometowns: hometowns);
  }

  /// Set minimum rating
  void setMinRating(double? rating) {
    state = state.copyWith(minRating: rating);
  }

  /// Set sort by
  void setSortBy(BandSortBy sortBy) {
    state = state.copyWith(sortBy: sortBy);
  }

  /// Clear all filters
  void clearAll() {
    state = const BandFiltersState();
  }

  /// Apply filters and close sheet (used in UI)
  void applyFilters() {
    // Filters are already applied via state
    // This method can be used for analytics or additional logic
  }
}

/// Provider for band filters
final bandFiltersProvider =
    StateNotifierProvider<BandFiltersNotifier, BandFiltersState>((ref) {
  return BandFiltersNotifier();
});

/// Provider for available genres (fetched from API)
final availableGenresProvider = FutureProvider<List<String>>((ref) async {
  // This would fetch from the API in a real scenario
  // For now, return a default list
  return [
    'Rock',
    'Pop',
    'Jazz',
    'Blues',
    'Metal',
    'Alternative',
    'Indie',
    'Electronic',
    'Hip Hop',
    'Country',
    'Folk',
    'Punk',
    'Reggae',
    'Classical',
    'R&B',
    'Other',
  ];
});
