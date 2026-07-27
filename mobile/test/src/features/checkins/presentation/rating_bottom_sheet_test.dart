import 'package:dartz/dartz.dart' hide State;
import 'package:flutter/material.dart';
import 'package:flutter_rating_bar/flutter_rating_bar.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:soundcheck_flutter/src/core/api/dio_client.dart';
import 'package:soundcheck_flutter/src/core/error/failures.dart';
import 'package:soundcheck_flutter/src/core/providers/providers.dart';
import 'package:soundcheck_flutter/src/features/checkins/data/checkin_repository.dart';
import 'package:soundcheck_flutter/src/features/checkins/domain/checkin.dart';
import 'package:soundcheck_flutter/src/features/checkins/domain/nearby_event.dart';
import 'package:soundcheck_flutter/src/features/checkins/presentation/rating_bottom_sheet.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('RatingBottomSheet', () {
    testWidgets('requires a rating and submits a headliner score', (
      tester,
    ) async {
      final repository = _RatingRepository(results: [Right(_ratedCheckIn())]);
      await tester.pumpWidget(_app(repository: repository, lineup: _lineup));

      await tester.tap(find.text('Open ratings'));
      await tester.pumpAndSettle();

      expect(find.text('Rate Your Experience'), findsOneWidget);
      expect(find.text('The Headliners'), findsOneWidget);
      expect(find.text('Headliner'), findsOneWidget);
      expect(
        find.text('Rate at least one band or the venue to submit'),
        findsOneWidget,
      );
      expect(
        tester
            .widget<ElevatedButton>(
              find.widgetWithText(ElevatedButton, 'Submit Ratings'),
            )
            .onPressed,
        isNull,
      );

      tester.widget<RatingBar>(find.byType(RatingBar)).onRatingUpdate(4.5);
      await tester.pump();
      expect(find.text('4.5'), findsOneWidget);
      expect(find.byIcon(Icons.check_circle), findsOneWidget);

      await tester.tap(find.widgetWithText(ElevatedButton, 'Submit Ratings'));
      await tester.pumpAndSettle();

      expect(repository.requests, [
        const _RatingRequest(
          checkinId: 'checkin-1',
          bandRatings: [
            {'bandId': 'band-1', 'rating': 4.5},
          ],
        ),
      ]);
      expect(find.text('Result: true'), findsOneWidget);
      expect(find.text('Rate Your Experience'), findsNothing);
    });

    testWidgets('failed submission stays open and allows retry', (
      tester,
    ) async {
      final repository = _RatingRepository(
        results: const [Left(NetworkFailure('offline'))],
      );
      await tester.pumpWidget(_app(repository: repository, lineup: _lineup));

      await tester.tap(find.text('Open ratings'));
      await tester.pumpAndSettle();
      tester.widget<RatingBar>(find.byType(RatingBar)).onRatingUpdate(3);
      await tester.pump();

      await tester.tap(find.widgetWithText(ElevatedButton, 'Submit Ratings'));
      await tester.pump();

      expect(
        find.text('Failed to save ratings. Please try again.'),
        findsOneWidget,
      );
      expect(find.text('Rate Your Experience'), findsOneWidget);
      expect(
        tester
            .widget<ElevatedButton>(
              find.widgetWithText(ElevatedButton, 'Submit Ratings'),
            )
            .onPressed,
        isNotNull,
      );
    });

    testWidgets('venue tab labels the score and submits venue-only rating', (
      tester,
    ) async {
      final repository = _RatingRepository(results: [Right(_ratedCheckIn())]);
      await tester.pumpWidget(
        _app(repository: repository, lineup: const [], initialTab: 1),
      );

      await tester.tap(find.text('Open ratings'));
      await tester.pumpAndSettle();
      expect(find.text('SoundCheck Hall'), findsOneWidget);
      expect(find.text('How was the venue experience?'), findsOneWidget);

      tester.widget<RatingBar>(find.byType(RatingBar)).onRatingUpdate(4);
      await tester.pump();
      expect(find.text('Great'), findsOneWidget);

      await tester.tap(find.widgetWithText(ElevatedButton, 'Submit Ratings'));
      await tester.pumpAndSettle();

      expect(repository.requests.single.venueRating, 4);
      expect(repository.requests.single.bandRatings, isNull);
      expect(find.text('Result: true'), findsOneWidget);
    });

    testWidgets('empty lineup communicates that bands cannot be rated', (
      tester,
    ) async {
      final repository = _RatingRepository();
      await tester.pumpWidget(_app(repository: repository, lineup: const []));

      await tester.tap(find.text('Open ratings'));
      await tester.pumpAndSettle();

      expect(find.text('No bands in lineup for this event'), findsOneWidget);
      expect(repository.requests, isEmpty);
    });
  });
}

Widget _app({
  required _RatingRepository repository,
  required List<NearbyEventLineup> lineup,
  int initialTab = 0,
}) {
  return ProviderScope(
    retry: (_, _) => null,
    overrides: [checkInRepositoryProvider.overrideWithValue(repository)],
    child: MaterialApp(
      home: Scaffold(
        body: _RatingHarness(lineup: lineup, initialTab: initialTab),
      ),
    ),
  );
}

class _RatingHarness extends StatefulWidget {
  const _RatingHarness({required this.lineup, required this.initialTab});

  final List<NearbyEventLineup> lineup;
  final int initialTab;

  @override
  State<_RatingHarness> createState() => _RatingHarnessState();
}

class _RatingHarnessState extends State<_RatingHarness> {
  bool? _result;

  Future<void> _open() async {
    final result = await RatingBottomSheet.show(
      context,
      checkinId: 'checkin-1',
      eventId: 'event-1',
      lineup: widget.lineup,
      venueName: 'SoundCheck Hall',
      initialTab: widget.initialTab,
    );
    if (mounted) setState(() => _result = result);
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        ElevatedButton(onPressed: _open, child: const Text('Open ratings')),
        Text('Result: $_result'),
      ],
    );
  }
}

const _lineup = [
  NearbyEventLineup(
    bandId: 'band-1',
    setOrder: 1,
    isHeadliner: true,
    band: NearbyEventBand(id: 'band-1', name: 'The Headliners'),
  ),
];

CheckIn _ratedCheckIn() => const CheckIn(
  id: 'checkin-1',
  userId: 'user-1',
  createdAt: '2026-07-27T20:00:00Z',
  updatedAt: '2026-07-27T20:00:00Z',
  bandRating: 4.5,
);

class _RatingRequest {
  const _RatingRequest({
    required this.checkinId,
    this.bandRatings,
    this.venueRating,
  });

  final String checkinId;
  final List<Map<String, dynamic>>? bandRatings;
  final double? venueRating;

  @override
  bool operator ==(Object other) =>
      other is _RatingRequest &&
      other.checkinId == checkinId &&
      _deepEquals(other.bandRatings, bandRatings) &&
      other.venueRating == venueRating;

  @override
  int get hashCode => Object.hash(checkinId, venueRating);
}

bool _deepEquals(
  List<Map<String, dynamic>>? left,
  List<Map<String, dynamic>>? right,
) {
  if (left == null || right == null) return left == right;
  if (left.length != right.length) return false;
  for (var index = 0; index < left.length; index++) {
    final leftItem = left[index];
    final rightItem = right[index];
    if (leftItem.length != rightItem.length) return false;
    if (!leftItem.keys.every((key) => leftItem[key] == rightItem[key])) {
      return false;
    }
  }
  return true;
}

class _RatingRepository extends CheckInRepository {
  _RatingRepository({List<Either<Failure, CheckIn>> results = const []})
    : _results = [...results],
      super(dioClient: DioClient(secureStorage: const FlutterSecureStorage()));

  final List<Either<Failure, CheckIn>> _results;
  final List<_RatingRequest> requests = [];

  @override
  Future<Either<Failure, CheckIn>> submitRatings(
    String checkinId, {
    List<Map<String, dynamic>>? bandRatings,
    double? venueRating,
  }) async {
    requests.add(
      _RatingRequest(
        checkinId: checkinId,
        bandRatings: bandRatings,
        venueRating: venueRating,
      ),
    );
    return _results.removeAt(0);
  }
}
