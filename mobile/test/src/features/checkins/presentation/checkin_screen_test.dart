import 'package:dartz/dartz.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:soundcheck_flutter/src/core/api/dio_client.dart';
import 'package:soundcheck_flutter/src/core/error/failures.dart';
import 'package:soundcheck_flutter/src/core/providers/providers.dart';
import 'package:soundcheck_flutter/src/core/services/websocket_service.dart';
import 'package:soundcheck_flutter/src/features/bands/domain/band.dart';
import 'package:soundcheck_flutter/src/features/checkins/data/checkin_repository.dart';
import 'package:soundcheck_flutter/src/features/checkins/domain/checkin.dart';
import 'package:soundcheck_flutter/src/features/checkins/domain/nearby_event.dart';
import 'package:soundcheck_flutter/src/features/checkins/presentation/checkin_screen.dart';
import 'package:soundcheck_flutter/src/features/checkins/presentation/providers/checkin_providers.dart';
import 'package:soundcheck_flutter/src/features/sharing/presentation/celebration_screen.dart';
import 'package:soundcheck_flutter/src/features/venues/data/venue_repository.dart';
import 'package:soundcheck_flutter/src/features/venues/domain/paginated_venues.dart';
import 'package:soundcheck_flutter/src/features/venues/domain/venue.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  setUp(_disableLocationServices);
  tearDown(_resetLocationServices);

  group('CheckInScreen event-first flow', () {
    testWidgets('renders nearby show metadata and completes one-tap check-in', (
      tester,
    ) async {
      final repository = _ScreenCheckInRepository(
        eventResults: [Right(_checkIn('event-checkin'))],
      );
      final webSocket = _ScreenWebSocketService();
      addTearDown(webSocket.dispose);

      await tester.pumpWidget(
        _app(
          repository: repository,
          webSocket: webSocket,
          nearbyEvents: [_nearbyEvent],
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Shows near you'), findsOneWidget);
      expect(find.text('Summer Sound'), findsOneWidget);
      expect(find.text('SoundCheck Hall, New York'), findsOneWidget);
      expect(find.text('1.2 km'), findsOneWidget);
      expect(find.text('Doors: 18:30 | Starts: 20:00'), findsOneWidget);
      expect(find.text('The Headliners'), findsOneWidget);
      expect(find.text('12 checked in'), findsOneWidget);

      await tester.tap(find.text('Check In'));
      await _pumpAsyncAction(tester);

      expect(repository.eventRequests, ['event-1']);
      expect(webSocket.joinedEventIds, ['event-1']);
      expect(find.text('Celebrating Summer Sound'), findsOneWidget);
      expect(find.text('event-checkin at SoundCheck Hall'), findsOneWidget);
    });

    testWidgets('duplicate check-in remains on the show list with guidance', (
      tester,
    ) async {
      final repository = _ScreenCheckInRepository(
        eventResults: const [Left(ConflictFailure('already checked in'))],
      );
      final webSocket = _ScreenWebSocketService();
      addTearDown(webSocket.dispose);

      await tester.pumpWidget(
        _app(
          repository: repository,
          webSocket: webSocket,
          nearbyEvents: [_nearbyEvent],
        ),
      );
      await tester.pumpAndSettle();

      await tester.tap(find.text('Check In'));
      await _pumpAsyncAction(tester);

      expect(
        find.text("You've already checked in to this event"),
        findsOneWidget,
      );
      expect(find.text('Shows near you'), findsOneWidget);
      expect(webSocket.joinedEventIds, isEmpty);
    });

    testWidgets('empty event results offer a working manual fallback', (
      tester,
    ) async {
      final repository = _ScreenCheckInRepository();
      final webSocket = _ScreenWebSocketService();
      addTearDown(webSocket.dispose);

      await tester.pumpWidget(
        _app(
          repository: repository,
          webSocket: webSocket,
          nearbyEvents: const [],
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('No shows near you right now'), findsOneWidget);
      expect(find.text('Grant location access'), findsOneWidget);

      await tester.tap(find.text('Check in manually'));
      await tester.pumpAndSettle();

      expect(find.text('What are you watching?'), findsOneWidget);
      expect(find.text('Search for a band to check in'), findsOneWidget);
      expect(find.text('Back to nearby events'), findsOneWidget);
    });
  });

  group('CheckInScreen manual fallback', () {
    testWidgets('selects band and venue, enriches, then submits', (
      tester,
    ) async {
      _failImagePickerWithPermissionDenied();
      addTearDown(_resetImagePicker);
      final repository = _ScreenCheckInRepository(
        manualResults: [Right(_checkIn('manual-checkin'))],
      );
      final webSocket = _ScreenWebSocketService();
      addTearDown(webSocket.dispose);

      await tester.pumpWidget(
        _app(
          repository: repository,
          webSocket: webSocket,
          nearbyEvents: const [],
        ),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text('Check in manually'));
      await tester.pumpAndSettle();

      await tester.enterText(find.byType(TextField).first, 'headliners');
      await tester.pumpAndSettle();
      expect(find.text('The Headliners'), findsOneWidget);
      await tester.tap(find.text('The Headliners'));
      await tester.pumpAndSettle();

      expect(find.text('Where are you?'), findsOneWidget);
      expect(find.text('How is it?'), findsOneWidget);
      expect(find.text('Add photos (0/4)'), findsOneWidget);
      expect(find.text('Tag the vibes'), findsOneWidget);

      await tester.ensureVisible(find.text('Tap to add photo'));
      await tester.tap(find.text('Tap to add photo'));
      await tester.pumpAndSettle();
      expect(find.text('Choose from Gallery'), findsOneWidget);
      expect(find.text('Take a Photo'), findsOneWidget);
      await tester.tap(find.text('Choose from Gallery'));
      await tester.pumpAndSettle();
      expect(
        find.text('Failed to pick image. Please try again.'),
        findsOneWidget,
      );

      await tester.ensureVisible(find.text('More vibes'));
      await tester.tap(find.text('More vibes'));
      await tester.pump();
      expect(find.text('Mosh Pit'), findsOneWidget);
      await tester.tap(find.text('Mosh Pit'));
      await tester.pump();

      await tester.ensureVisible(find.text('Select venue...'));
      await tester.tap(find.text('Select venue...'));
      await tester.pumpAndSettle();
      await tester.enterText(find.byType(TextField).last, 'soundcheck');
      await tester.pump(const Duration(milliseconds: 400));
      await tester.pumpAndSettle();
      expect(find.text('SoundCheck Hall'), findsOneWidget);
      await tester.tap(find.text('SoundCheck Hall'));
      await tester.pumpAndSettle();

      final stars = find.byIcon(Icons.star_border);
      expect(stars, findsNWidgets(5));
      await tester.ensureVisible(stars.at(3));
      await tester.tap(stars.at(3));
      await tester.pump();

      await tester.ensureVisible(find.text('Share your experience...'));
      await tester.enterText(find.byType(TextField).last, 'Great show');

      await tester.ensureVisible(find.text('Check In'));
      await tester.tap(find.text('Check In'));
      await _pumpAsyncAction(tester);

      expect(repository.manualRequests, hasLength(1));
      final request = repository.manualRequests.single;
      expect(request.bandId, 'band-1');
      expect(request.venueId, 'venue-1');
      expect(request.rating, 4);
      expect(request.comment, 'Great show');
      expect(request.vibeTagIds, contains('mosh_pit'));
      expect(find.text('Celebrating The Headliners'), findsOneWidget);
      expect(find.text('manual-checkin at SoundCheck Hall'), findsOneWidget);
    });

    testWidgets('manual duplicate is reported and remains retryable', (
      tester,
    ) async {
      final repository = _ScreenCheckInRepository(
        manualResults: const [Left(ConflictFailure('duplicate check-in'))],
      );
      final webSocket = _ScreenWebSocketService();
      addTearDown(webSocket.dispose);

      await tester.pumpWidget(
        _app(
          repository: repository,
          webSocket: webSocket,
          nearbyEvents: const [],
        ),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text('Check in manually'));
      await tester.pumpAndSettle();
      await tester.enterText(find.byType(TextField).first, 'headliners');
      await tester.pumpAndSettle();
      await tester.tap(find.text('The Headliners'));
      await tester.pumpAndSettle();

      await tester.tap(find.text('Select venue...'));
      await tester.pumpAndSettle();
      await tester.enterText(find.byType(TextField).last, 'soundcheck');
      await tester.pump(const Duration(milliseconds: 400));
      await tester.pumpAndSettle();
      await tester.tap(find.text('SoundCheck Hall'));
      await tester.pumpAndSettle();

      await tester.ensureVisible(find.text('Check In'));
      await tester.tap(find.text('Check In'));
      await _pumpAsyncAction(tester);

      expect(
        find.text("You've already checked in to this band here today"),
        findsOneWidget,
      );
      expect(find.text('Where are you?'), findsOneWidget);
      expect(
        tester
            .widget<ElevatedButton>(
              find.widgetWithText(ElevatedButton, 'Check In'),
            )
            .onPressed,
        isNotNull,
      );
    });
  });
}

Widget _app({
  required _ScreenCheckInRepository repository,
  required _ScreenWebSocketService webSocket,
  required List<NearbyEvent> nearbyEvents,
}) {
  final router = GoRouter(
    initialLocation: '/checkin',
    routes: [
      GoRoute(path: '/checkin', builder: (_, _) => const CheckInScreen()),
      GoRoute(
        path: '/celebration',
        builder: (_, state) {
          final params = state.extra! as CelebrationParams;
          return Scaffold(
            body: Column(
              children: [
                Text('Celebrating ${params.bandName}'),
                Text('${params.checkinId} at ${params.venueName}'),
              ],
            ),
          );
        },
      ),
    ],
  );

  return ProviderScope(
    retry: (_, _) => null,
    overrides: [
      checkInRepositoryProvider.overrideWithValue(repository),
      venueRepositoryProvider.overrideWithValue(_ScreenVenueRepository()),
      webSocketServiceProvider.overrideWithValue(webSocket),
      nearbyEventsProvider.overrideWith((_) async => nearbyEvents),
      searchBandsForCheckinProvider.overrideWith((_) async => [_band]),
    ],
    child: MaterialApp.router(routerConfig: router),
  );
}

const _nearbyEvent = NearbyEvent(
  id: 'event-1',
  eventDate: '2026-07-27T20:00:00Z',
  eventName: 'Summer Sound',
  doorsTime: '18:30',
  startTime: '20:00',
  distanceKm: 1.2,
  checkinCount: 12,
  venue: NearbyEventVenue(
    id: 'venue-1',
    name: 'SoundCheck Hall',
    city: 'New York',
  ),
  lineup: [
    NearbyEventLineup(
      bandId: 'band-1',
      isHeadliner: true,
      band: NearbyEventBand(id: 'band-1', name: 'The Headliners'),
    ),
  ],
);

const _band = Band(
  id: 'band-1',
  name: 'The Headliners',
  genre: 'Rock',
  averageRating: 4.5,
  isActive: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
);

CheckIn _checkIn(String id) => CheckIn(
  id: id,
  userId: 'user-1',
  createdAt: '2026-07-27T20:00:00Z',
  updatedAt: '2026-07-27T20:00:00Z',
  event: const CheckInEvent(
    id: 'event-1',
    band: CheckInBand(id: 'band-1', name: 'The Headliners'),
    venue: CheckInVenue(id: 'venue-1', name: 'SoundCheck Hall'),
  ),
);

class _ManualRequest {
  const _ManualRequest({
    required this.bandId,
    required this.venueId,
    this.rating,
    this.comment,
    this.vibeTagIds,
  });

  final String bandId;
  final String venueId;
  final double? rating;
  final String? comment;
  final List<String>? vibeTagIds;
}

class _ScreenCheckInRepository extends CheckInRepository {
  _ScreenCheckInRepository({
    List<Either<Failure, CheckIn>> eventResults = const [],
    List<Either<Failure, CheckIn>> manualResults = const [],
  }) : _eventResults = [...eventResults],
       _manualResults = [...manualResults],
       super(dioClient: DioClient(secureStorage: const FlutterSecureStorage()));

  final List<Either<Failure, CheckIn>> _eventResults;
  final List<Either<Failure, CheckIn>> _manualResults;
  final List<String> eventRequests = [];
  final List<_ManualRequest> manualRequests = [];

  @override
  Future<Either<Failure, CheckIn>> createEventCheckIn({
    required String eventId,
    double? locationLat,
    double? locationLon,
  }) async {
    eventRequests.add(eventId);
    return _eventResults.removeAt(0);
  }

  @override
  Future<Either<Failure, CheckIn>> createManualCheckIn({
    required String bandId,
    required String venueId,
    double? rating,
    String? comment,
    List<String>? vibeTagIds,
    double? locationLat,
    double? locationLon,
  }) async {
    manualRequests.add(
      _ManualRequest(
        bandId: bandId,
        venueId: venueId,
        rating: rating,
        comment: comment,
        vibeTagIds: vibeTagIds,
      ),
    );
    return _manualResults.removeAt(0);
  }
}

class _ScreenVenueRepository extends VenueRepository {
  _ScreenVenueRepository()
    : super(dioClient: DioClient(secureStorage: const FlutterSecureStorage()));

  @override
  Future<PaginatedVenues> searchVenues({
    required int page,
    required int limit,
    String? query,
    String? city,
    String? venueType,
    double? minRating,
    int? minCapacity,
    int? maxCapacity,
    String? sortBy,
  }) async {
    return const PaginatedVenues(
      venues: [
        Venue(
          id: 'venue-1',
          name: 'SoundCheck Hall',
          city: 'New York',
          state: 'NY',
          averageRating: 4.5,
          isActive: true,
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        ),
      ],
      total: 1,
      page: 1,
      totalPages: 1,
    );
  }
}

class _ScreenWebSocketService extends WebSocketService {
  final List<String> joinedEventIds = [];
  final List<String> leftEventIds = [];

  @override
  void joinEventRoom(String eventId) {
    joinedEventIds.add(eventId);
  }

  @override
  void leaveEventRoom(String eventId) {
    leftEventIds.add(eventId);
  }
}

const _imagePickerChannel = MethodChannel('plugins.flutter.io/image_picker');

void _failImagePickerWithPermissionDenied() {
  TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
      .setMockMethodCallHandler(_imagePickerChannel, (_) async {
        throw PlatformException(
          code: 'photo_access_denied',
          message: 'Permission denied for this test',
        );
      });
}

void _resetImagePicker() {
  TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
      .setMockMethodCallHandler(_imagePickerChannel, null);
}

const _geolocatorChannel = MethodChannel('flutter.baseflow.com/geolocator');

void _disableLocationServices() {
  TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
      .setMockMethodCallHandler(_geolocatorChannel, (call) async {
        if (call.method == 'isLocationServiceEnabled') return false;
        return null;
      });
}

void _resetLocationServices() {
  TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
      .setMockMethodCallHandler(_geolocatorChannel, null);
}

Future<void> _pumpAsyncAction(WidgetTester tester) async {
  for (var index = 0; index < 8; index++) {
    await tester.pump(const Duration(milliseconds: 100));
  }
}
