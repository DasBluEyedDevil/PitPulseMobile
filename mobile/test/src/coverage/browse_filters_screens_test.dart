import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:soundcheck_flutter/src/core/api/dio_client.dart';
import 'package:soundcheck_flutter/src/core/error/failures.dart';
import 'package:soundcheck_flutter/src/core/providers/providers.dart';
import 'package:soundcheck_flutter/src/features/bands/presentation/band_filters_notifier.dart';
import 'package:soundcheck_flutter/src/features/bands/presentation/bands_screen.dart';
import 'package:soundcheck_flutter/src/features/bands/presentation/widgets/band_filters_sheet.dart';
import 'package:soundcheck_flutter/src/features/venues/data/venue_repository.dart';
import 'package:soundcheck_flutter/src/features/venues/domain/paginated_venues.dart';
import 'package:soundcheck_flutter/src/features/venues/domain/venue.dart';
import 'package:soundcheck_flutter/src/features/venues/presentation/providers/venue_providers.dart';
import 'package:soundcheck_flutter/src/features/venues/presentation/venue_filters_notifier.dart';
import 'package:soundcheck_flutter/src/features/venues/presentation/venue_filters_state.dart';
import 'package:soundcheck_flutter/src/features/venues/presentation/venues_screen.dart';
import 'package:soundcheck_flutter/src/features/venues/presentation/widgets/venue_filters_sheet.dart';

void main() {
  testWidgets('BandsScreen exposes empty, active-filter, and sheet behavior', (
    tester,
  ) async {
    final container = ProviderContainer(
      overrides: [filteredBandsProvider.overrideWith((ref) async => const [])],
    );
    addTearDown(container.dispose);
    final filterSubscription = container.listen(
      bandFiltersProvider,
      (_, _) {},
      fireImmediately: true,
    );
    addTearDown(filterSubscription.close);

    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: const MaterialApp(home: BandsScreen()),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('Bands'), findsOneWidget);

    await tester.tap(find.byIcon(Icons.filter_list));
    await tester.pumpAndSettle();
    expect(find.byType(BandFiltersSheet), findsOneWidget);
    expect(find.text('Filters & Sort'), findsOneWidget);
    await tester.scrollUntilVisible(
      find.text('Genre'),
      300,
      scrollable: find.byType(Scrollable).last,
    );
    expect(find.text('Genre'), findsOneWidget);
    await tester.scrollUntilVisible(
      find.widgetWithText(FilterChip, 'Rock'),
      300,
      scrollable: find.byType(Scrollable).last,
    );

    await tester.tap(find.widgetWithText(FilterChip, 'Rock'));
    await tester.pump();
    expect(container.read(bandFiltersProvider).genres, ['Rock']);
    expect(find.text('Clear All'), findsOneWidget);

    await tester.tap(find.text('Clear All'));
    await tester.pump();
    expect(container.read(bandFiltersProvider).hasActiveFilters, isFalse);
    await tester.ensureVisible(find.text('Apply Filters'));
    await tester.tap(find.text('Apply Filters'));
    await tester.pumpAndSettle();
    expect(find.byType(BandFiltersSheet), findsNothing);

    container.read(bandFiltersProvider.notifier).toggleGenre('Metal');
    await tester.pumpAndSettle();
    expect(find.text('No Bands Found'), findsOneWidget);
    expect(find.text('Metal'), findsOneWidget);
    await tester.tap(find.byIcon(Icons.close).first);
    await tester.pumpAndSettle();
    expect(container.read(bandFiltersProvider).hasActiveFilters, isFalse);
  });

  testWidgets('VenueFiltersSheet applies type, rating, and capacity', (
    tester,
  ) async {
    final container = ProviderContainer();
    addTearDown(container.dispose);
    final subscription = container.listen(
      venueFiltersProvider,
      (_, _) {},
      fireImmediately: true,
    );
    addTearDown(subscription.close);

    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: const MaterialApp(home: Scaffold(body: VenueFiltersSheet())),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Filters & Sort'), findsOneWidget);
    await tester.scrollUntilVisible(
      find.text('Venue Type'),
      300,
      scrollable: find.byType(Scrollable).last,
    );
    expect(find.text('Venue Type'), findsOneWidget);
    await tester.scrollUntilVisible(
      find.widgetWithText(FilterChip, 'Concert Hall'),
      300,
      scrollable: find.byType(Scrollable).last,
    );
    await tester.pump();
    await tester.tap(find.widgetWithText(FilterChip, 'Concert Hall'));
    await tester.pump();
    expect(container.read(venueFiltersProvider).venueTypes, [
      VenueType.concertHall,
    ]);

    await tester.ensureVisible(find.widgetWithText(TextField, 'Min'));
    await tester.enterText(find.widgetWithText(TextField, 'Min'), '250');
    await tester.enterText(find.widgetWithText(TextField, 'Max'), '5000');
    await tester.pump();
    expect(container.read(venueFiltersProvider).minCapacity, 250);
    expect(container.read(venueFiltersProvider).maxCapacity, 5000);

    final slider = tester.widget<Slider>(find.byType(Slider));
    slider.onChanged?.call(4);
    await tester.pump();
    expect(container.read(venueFiltersProvider).minRating, 4);
    expect(find.text('Clear All'), findsOneWidget);
    await tester.tap(find.text('Clear All'));
    await tester.pump();
    expect(container.read(venueFiltersProvider), const VenueFiltersState());
  });

  test('paginated venue provider loads, filters, streams, and stops', () async {
    final repository = _VenueRepositoryFake([
      PaginatedVenues(
        venues: List.generate(20, _venue),
        total: 21,
        page: 1,
        totalPages: 2,
      ),
      PaginatedVenues(venues: [_venue(20)], total: 21, page: 2, totalPages: 2),
      const PaginatedVenues(venues: [], total: 0, page: 1, totalPages: 1),
    ]);
    final container = ProviderContainer(
      overrides: [venueRepositoryProvider.overrideWithValue(repository)],
    );
    addTearDown(container.dispose);
    final subscription = container.listen(
      paginatedVenuesProvider,
      (_, _) {},
      fireImmediately: true,
    );
    addTearDown(subscription.close);

    await Future<void>.delayed(Duration.zero);
    await Future<void>.delayed(Duration.zero);
    expect(container.read(paginatedVenuesProvider).venues, hasLength(20));

    await container.read(paginatedVenuesProvider.notifier).loadMore();
    expect(container.read(paginatedVenuesProvider).venues, hasLength(21));
    expect(container.read(paginatedVenuesProvider).hasMore, isFalse);

    container
        .read(paginatedVenuesProvider.notifier)
        .updateFilters(
          const VenueFiltersState(
            cities: ['Detroit'],
            venueTypes: [VenueType.club],
            minCapacity: 100,
            maxCapacity: 2000,
            minRating: 4,
          ),
        );
    await Future<void>.delayed(Duration.zero);
    await Future<void>.delayed(Duration.zero);
    expect(repository.requests.last.city, 'Detroit');
    expect(repository.requests.last.venueType, 'club');

    container.read(paginatedVenuesProvider.notifier).search('ignored');
  });

  test(
    'paginated venue provider classifies typed and unknown failures',
    () async {
      for (final failure in <Object>[
        const NetworkFailure('offline'),
        StateError('malformed'),
      ]) {
        final container = ProviderContainer(
          overrides: [
            venueRepositoryProvider.overrideWithValue(
              _VenueRepositoryFake([failure]),
            ),
          ],
        );
        final subscription = container.listen(
          paginatedVenuesProvider,
          (_, _) {},
          fireImmediately: true,
        );
        await Future<void>.delayed(Duration.zero);
        await Future<void>.delayed(Duration.zero);

        final error = container.read(paginatedVenuesProvider).error;
        expect(
          error,
          failure is Failure ? same(failure) : isA<UnknownFailure>(),
        );
        subscription.close();
        container.dispose();
      }
    },
  );

  testWidgets('VenuesScreen renders an empty result and opens filters', (
    tester,
  ) async {
    final repository = _VenueRepositoryFake([
      const PaginatedVenues(venues: [], total: 0, page: 1, totalPages: 1),
    ]);

    await tester.pumpWidget(
      ProviderScope(
        overrides: [venueRepositoryProvider.overrideWithValue(repository)],
        child: const MaterialApp(home: VenuesScreen()),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Venues'), findsOneWidget);
    await tester.tap(find.byIcon(Icons.filter_list));
    await tester.pumpAndSettle();
    expect(find.byType(VenueFiltersSheet), findsOneWidget);
  });
}

Venue _venue(int index) {
  return Venue(
    id: 'venue-$index',
    name: 'Venue $index',
    averageRating: 4,
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  );
}

class _VenueRequest {
  const _VenueRequest({
    required this.city,
    required this.venueType,
    required this.page,
  });

  final String? city;
  final String? venueType;
  final int page;
}

class _VenueRepositoryFake extends VenueRepository {
  _VenueRepositoryFake(List<Object> outcomes)
    : _outcomes = [...outcomes],
      super(dioClient: DioClient(secureStorage: const FlutterSecureStorage()));

  final List<Object> _outcomes;
  final requests = <_VenueRequest>[];

  @override
  Future<PaginatedVenues> getVenues({
    required int page,
    required int limit,
    String? search,
    String? city,
    String? venueType,
    double? minRating,
    int? minCapacity,
    int? maxCapacity,
    String? sortBy,
  }) async {
    requests.add(_VenueRequest(city: city, venueType: venueType, page: page));
    final outcome = _outcomes.removeAt(0);
    if (outcome is PaginatedVenues) return outcome;
    throw outcome;
  }
}
