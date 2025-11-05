import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'venue_filters_state.dart';
import '../domain/venue.dart';

/// StateNotifier for managing venue filters
class VenueFiltersNotifier extends StateNotifier<VenueFiltersState> {
  VenueFiltersNotifier() : super(const VenueFiltersState());

  /// Toggle venue type filter
  void toggleVenueType(VenueType type) {
    final types = List<VenueType>.from(state.venueTypes);
    if (types.contains(type)) {
      types.remove(type);
    } else {
      types.add(type);
    }
    state = state.copyWith(venueTypes: types);
  }

  /// Set venue types
  void setVenueTypes(List<VenueType> types) {
    state = state.copyWith(venueTypes: types);
  }

  /// Toggle city filter
  void toggleCity(String city) {
    final cities = List<String>.from(state.cities);
    if (cities.contains(city)) {
      cities.remove(city);
    } else {
      cities.add(city);
    }
    state = state.copyWith(cities: cities);
  }

  /// Set cities
  void setCities(List<String> cities) {
    state = state.copyWith(cities: cities);
  }

  /// Set capacity range
  void setCapacityRange({int? min, int? max}) {
    state = state.copyWith(
      minCapacity: min,
      maxCapacity: max,
    );
  }

  /// Set minimum rating
  void setMinRating(double? rating) {
    state = state.copyWith(minRating: rating);
  }

  /// Set sort by
  void setSortBy(VenueSortBy sortBy) {
    state = state.copyWith(sortBy: sortBy);
  }

  /// Clear all filters
  void clearAll() {
    state = const VenueFiltersState();
  }

  /// Apply filters and close sheet (used in UI)
  void applyFilters() {
    // Filters are already applied via state
    // This method can be used for analytics or additional logic
  }
}

/// Provider for venue filters
final venueFiltersProvider =
    StateNotifierProvider<VenueFiltersNotifier, VenueFiltersState>((ref) {
  return VenueFiltersNotifier();
});
