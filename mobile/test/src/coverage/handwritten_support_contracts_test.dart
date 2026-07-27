import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:soundcheck_flutter/src/core/security/secure_storage_options.dart';
import 'package:soundcheck_flutter/src/core/theme/theme_provider.dart';
import 'package:soundcheck_flutter/src/features/bands/presentation/band_filters_notifier.dart';
import 'package:soundcheck_flutter/src/features/bands/presentation/band_filters_state.dart';
import 'package:soundcheck_flutter/src/features/venues/domain/venue.dart';
import 'package:soundcheck_flutter/src/features/venues/presentation/venue_filters_notifier.dart';
import 'package:soundcheck_flutter/src/features/venues/presentation/venue_filters_state.dart';
import 'package:soundcheck_flutter/src/shared/utils/image_compression.dart';
import 'package:soundcheck_flutter/src/shared/utils/snackbar_helper.dart';
import 'package:soundcheck_flutter/src/shared/widgets/band_card_skeleton.dart';
import 'package:soundcheck_flutter/src/shared/widgets/profile_skeleton.dart';
import 'package:soundcheck_flutter/src/shared/widgets/skeleton_list.dart';
import 'package:soundcheck_flutter/src/shared/widgets/venue_card_skeleton.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('secure storage factory returns the mobile credential store', () {
    expect(SecureStorageOptions.createStorage(), isA<FlutterSecureStorage>());
  });

  group('ThemeSetting', () {
    setUp(() {
      SharedPreferences.setMockInitialValues({});
    });

    test('persists explicit modes, toggles, and resolves ThemeMode', () async {
      final container = ProviderContainer();
      addTearDown(container.dispose);
      final subscription = container.listen(
        themeSettingProvider,
        (_, _) {},
        fireImmediately: true,
      );
      addTearDown(subscription.close);
      final notifier = container.read(themeSettingProvider.notifier);

      expect(container.read(themeSettingProvider), AppThemeMode.dark);
      expect(notifier.getThemeMode(), ThemeMode.dark);

      await notifier.setLightTheme();
      expect(container.read(themeSettingProvider), AppThemeMode.light);
      expect(notifier.getThemeMode(), ThemeMode.light);

      await notifier.toggleTheme();
      expect(container.read(themeSettingProvider), AppThemeMode.dark);

      await notifier.setSystemTheme();
      expect(notifier.getThemeMode(), ThemeMode.system);

      await notifier.setTheme(AppThemeMode.light);
      expect(container.read(themeSettingProvider), AppThemeMode.dark);
    });

    test('loads a stored mode and falls back for unknown data', () async {
      SharedPreferences.setMockInitialValues({
        'theme_mode': AppThemeMode.light.toString(),
      });
      final stored = ProviderContainer();
      addTearDown(stored.dispose);
      stored.listen(themeSettingProvider, (_, _) {}, fireImmediately: true);
      await Future<void>.delayed(Duration.zero);
      expect(stored.read(themeSettingProvider), AppThemeMode.light);

      SharedPreferences.setMockInitialValues({'theme_mode': 'retired'});
      final unknown = ProviderContainer();
      addTearDown(unknown.dispose);
      unknown.listen(themeSettingProvider, (_, _) {}, fireImmediately: true);
      await Future<void>.delayed(Duration.zero);
      expect(unknown.read(themeSettingProvider), AppThemeMode.system);
    });
  });

  group('band filters', () {
    test('state exposes labels, API values, counts, and clearing', () {
      const state = BandFiltersState(
        genres: ['Rock', 'Jazz'],
        hometowns: ['Detroit'],
        minRating: 4,
        sortBy: BandSortBy.ratingDesc,
      );

      expect(state.activeFilterCount, 3);
      expect(state.hasActiveFilters, isTrue);
      expect(state.toQueryParams(), {
        'genre': 'Rock,Jazz',
        'hometown': 'Detroit',
        'minRating': 4,
        'sort': '-rating',
      });
      expect(state.clearAll().hasActiveFilters, isFalse);
      expect(
        BandSortBy.values.map((value) => value.label),
        everyElement(isNotEmpty),
      );
      expect(
        BandSortBy.values.map((value) => value.apiValue),
        everyElement(isNotEmpty),
      );
    });

    test('notifier applies and removes every filter family', () async {
      final container = ProviderContainer();
      addTearDown(container.dispose);
      final subscription = container.listen(
        bandFiltersProvider,
        (_, _) {},
        fireImmediately: true,
      );
      addTearDown(subscription.close);
      final notifier = container.read(bandFiltersProvider.notifier);

      notifier.toggleGenre('Rock');
      notifier.toggleHometown('Detroit');
      notifier.setMinRating(4);
      notifier.setSortBy(BandSortBy.checkinCountDesc);
      expect(container.read(bandFiltersProvider).activeFilterCount, 3);

      notifier.toggleGenre('Rock');
      notifier.toggleHometown('Detroit');
      notifier.setGenres(['Jazz']);
      notifier.setHometowns(['Chicago']);
      expect(container.read(bandFiltersProvider).genres, ['Jazz']);
      expect(container.read(bandFiltersProvider).hometowns, ['Chicago']);

      notifier.clearAll();
      expect(container.read(bandFiltersProvider), const BandFiltersState());
      expect(
        await container.read(availableGenresProvider.future),
        containsAll(['Rock', 'Jazz', 'Other']),
      );
    });
  });

  group('venue filters', () {
    test('state exposes labels, API values, counts, and clearing', () {
      final type = VenueType.values.first;
      final state = VenueFiltersState(
        venueTypes: [type],
        cities: const ['Detroit'],
        minCapacity: 100,
        maxCapacity: 5000,
        minRating: 4,
        sortBy: VenueSortBy.newestFirst,
      );

      expect(state.activeFilterCount, 4);
      expect(state.hasActiveFilters, isTrue);
      expect(state.toQueryParams(), {
        'venueType': type.name,
        'city': 'Detroit',
        'minCapacity': 100,
        'maxCapacity': 5000,
        'minRating': 4,
        'sort': '-createdAt',
      });
      expect(state.clearAll().hasActiveFilters, isFalse);
      expect(
        VenueSortBy.values.map((value) => value.label),
        everyElement(isNotEmpty),
      );
      expect(
        VenueSortBy.values.map((value) => value.apiValue),
        everyElement(isNotEmpty),
      );
    });

    test('notifier applies and removes every filter family', () {
      final container = ProviderContainer();
      addTearDown(container.dispose);
      final subscription = container.listen(
        venueFiltersProvider,
        (_, _) {},
        fireImmediately: true,
      );
      addTearDown(subscription.close);
      final notifier = container.read(venueFiltersProvider.notifier);
      final type = VenueType.values.first;

      notifier.toggleVenueType(type);
      notifier.toggleCity('Detroit');
      notifier.setCapacityRange(min: 100, max: 5000);
      notifier.setMinRating(4);
      notifier.setSortBy(VenueSortBy.ratingDesc);
      expect(container.read(venueFiltersProvider).activeFilterCount, 4);

      notifier.toggleVenueType(type);
      notifier.toggleCity('Detroit');
      notifier.setVenueTypes([type]);
      notifier.setCities(['Chicago']);
      expect(container.read(venueFiltersProvider).venueTypes, [type]);
      expect(container.read(venueFiltersProvider).cities, ['Chicago']);

      notifier.clearAll();
      expect(container.read(venueFiltersProvider), const VenueFiltersState());
    });
  });

  test(
    'image size and compression ratio utilities preserve arithmetic',
    () async {
      final directory = await Directory.systemTemp.createTemp(
        'soundcheck-image-contract-',
      );
      addTearDown(() async {
        if (await directory.exists()) {
          await directory.delete(recursive: true);
        }
      });
      final original = File('${directory.path}/original.bin')
        ..writeAsBytesSync(List<int>.filled(2048, 1));
      final compressed = File('${directory.path}/compressed.bin')
        ..writeAsBytesSync(List<int>.filled(1024, 1));

      expect(await ImageCompression.getFileSizeKB(original), 2);
      expect(
        await ImageCompression.getCompressionRatio(original, compressed),
        50,
      );
    },
  );

  testWidgets('all skeletons render in light and dark mobile themes', (
    tester,
  ) async {
    for (final brightness in [Brightness.light, Brightness.dark]) {
      await tester.pumpWidget(
        MaterialApp(
          theme: ThemeData(brightness: brightness),
          home: const Scaffold(
            body: SingleChildScrollView(
              child: Column(
                children: [
                  SizedBox(width: 320, height: 240, child: BandCardSkeleton()),
                  SizedBox(width: 320, height: 240, child: VenueCardSkeleton()),
                  SizedBox(height: 700, child: ProfileSkeleton()),
                  SizedBox(height: 220, child: SkeletonList(itemCount: 2)),
                ],
              ),
            ),
          ),
        ),
      );
      await tester.pump();

      expect(find.byType(BandCardSkeleton), findsOneWidget);
      expect(find.byType(VenueCardSkeleton), findsOneWidget);
      expect(find.byType(ProfileSkeleton), findsOneWidget);
      expect(find.byType(SkeletonListItem), findsNWidgets(2));
    }
  });

  testWidgets('snackbar variants replace, act, load, and dismiss', (
    tester,
  ) async {
    var actionCalled = false;
    late BuildContext context;
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: Builder(
            builder: (value) {
              context = value;
              return const SizedBox();
            },
          ),
        ),
      ),
    );

    SnackbarHelper.showSuccess(
      context,
      'Saved',
      action: SnackBarAction(
        label: 'Undo',
        onPressed: () => actionCalled = true,
      ),
    );
    await tester.pump(const Duration(milliseconds: 300));
    expect(find.text('Saved'), findsOneWidget);
    tester.widget<SnackBarAction>(find.byType(SnackBarAction)).onPressed();
    expect(actionCalled, isTrue);

    SnackbarHelper.showError(context, 'Failed');
    await tester.pump();
    expect(find.text('Failed'), findsOneWidget);
    SnackbarHelper.showInfo(context, 'Info');
    await tester.pump();
    expect(find.text('Info'), findsOneWidget);
    SnackbarHelper.showWarning(context, 'Warning');
    await tester.pump();
    expect(find.text('Warning'), findsOneWidget);
    SnackbarHelper.showLoading(context, 'Working');
    await tester.pump();
    expect(find.text('Working'), findsOneWidget);
    expect(find.byType(CircularProgressIndicator), findsOneWidget);

    SnackbarHelper.dismiss(context);
    await tester.pumpAndSettle();
    expect(find.text('Working'), findsNothing);
  });
}
