import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'venue_filters_state.dart';
import '../domain/venue.dart';

part 'venue_filters_notifier.g.dart';

@riverpod
class VenueFilters extends _$VenueFilters {
  @override
  VenueFiltersState build() => const VenueFiltersState();

  void toggleVenueType(VenueType type) {
    final types = List<VenueType>.from(state.venueTypes);
    if (types.contains(type)) {
      types.remove(type);
    } else {
      types.add(type);
    }
    state = state.copyWith(venueTypes: types);
  }

  void setVenueTypes(List<VenueType> types) {
    state = state.copyWith(venueTypes: types);
  }

  void toggleCity(String city) {
    final cities = List<String>.from(state.cities);
    if (cities.contains(city)) {
      cities.remove(city);
    } else {
      cities.add(city);
    }
    state = state.copyWith(cities: cities);
  }

  void setCities(List<String> cities) {
    state = state.copyWith(cities: cities);
  }

  void setCapacityRange({int? min, int? max}) {
    state = state.copyWith(
      minCapacity: min,
      maxCapacity: max,
    );
  }

  void setMinRating(double? rating) {
    state = state.copyWith(minRating: rating);
  }

  void setSortBy(VenueSortBy sortBy) {
    state = state.copyWith(sortBy: sortBy);
  }

  void clearAll() {
    state = const VenueFiltersState();
  }
}
