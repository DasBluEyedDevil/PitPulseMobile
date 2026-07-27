import 'dart:async';

import 'package:dartz/dartz.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:soundcheck_flutter/src/core/api/dio_client.dart';
import 'package:soundcheck_flutter/src/core/error/failures.dart';
import 'package:soundcheck_flutter/src/core/providers/providers.dart';
import 'package:soundcheck_flutter/src/core/services/websocket_service.dart';
import 'package:soundcheck_flutter/src/features/auth/domain/user.dart';
import 'package:soundcheck_flutter/src/features/checkins/data/checkin_repository.dart';
import 'package:soundcheck_flutter/src/features/checkins/domain/checkin.dart';
import 'package:soundcheck_flutter/src/features/checkins/domain/checkin_comment.dart';
import 'package:soundcheck_flutter/src/features/checkins/domain/vibe_tag.dart';
import 'package:soundcheck_flutter/src/features/checkins/presentation/checkin_detail_screen.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('CheckInDetailScreen', () {
    testWidgets(
      'renders complete content and executes toast and comment taps',
      (tester) async {
        final repository = _DetailRepository();
        final webSocket = _TrackingWebSocketService();
        addTearDown(webSocket.dispose);

        await tester.pumpWidget(
          _app(repository: repository, webSocket: webSocket),
        );
        await tester.pumpAndSettle();

        expect(webSocket.joinedIds, ['checkin-1']);
        expect(find.text('Check-in'), findsOneWidget);
        expect(find.text('alex'), findsWidgets);
        expect(find.text('The Headliners'), findsOneWidget);
        expect(find.text('SoundCheck Hall'), findsOneWidget);
        expect(find.text('Jul 27, 2026'), findsOneWidget);
        expect(find.text('Ratings'), findsOneWidget);
        expect(find.text('An unforgettable encore'), findsOneWidget);
        expect(find.text('Vibes'), findsOneWidget);
        expect(find.text('Great Sound'), findsOneWidget);
        expect(find.text('Earned this encore'), findsOneWidget);

        await tester.ensureVisible(find.byIcon(Icons.sports_bar));
        await tester.pumpAndSettle();
        await tester.tap(find.byIcon(Icons.sports_bar));
        await tester.pump();
        expect(repository.toastedIds, ['checkin-1']);

        await tester.enterText(find.byType(TextField).last, '  New comment  ');
        await tester.tap(find.byIcon(Icons.send));
        await tester.pump();
        expect(repository.addedComments, [('checkin-1', 'New comment')]);
        expect(
          tester
              .widget<TextField>(find.byType(TextField).last)
              .controller
              ?.text,
          isEmpty,
        );

        await tester.pumpWidget(const SizedBox.shrink());
        await tester.pump();
        expect(webSocket.leftIds, ['checkin-1']);
      },
    );

    testWidgets('realtime updates refetch only the matching check-in', (
      tester,
    ) async {
      final repository = _DetailRepository();
      final webSocket = _TrackingWebSocketService();
      addTearDown(webSocket.dispose);

      await tester.pumpWidget(
        _app(repository: repository, webSocket: webSocket),
      );
      await tester.pumpAndSettle();
      expect(repository.detailCalls, 1);
      expect(repository.commentCalls, 1);

      webSocket.emitToast({'checkinId': 'another-checkin'});
      await tester.pump();
      expect(repository.detailCalls, 1);
      expect(repository.commentCalls, 1);

      webSocket.emitToast({'checkInId': 'checkin-1'});
      await tester.pumpAndSettle();
      expect(repository.detailCalls, 2);
      expect(repository.commentCalls, 2);

      webSocket.emitComment({'checkinId': 'checkin-1'});
      await tester.pumpAndSettle();
      expect(repository.detailCalls, 3);
      expect(repository.commentCalls, 3);
    });

    testWidgets('error state retries and recovers without a dead tap', (
      tester,
    ) async {
      final repository = _DetailRepository(
        detailResults: [
          const Left(NetworkFailure('offline')),
          Right(_completeCheckIn()),
        ],
      );
      final webSocket = _TrackingWebSocketService();
      addTearDown(webSocket.dispose);

      await tester.pumpWidget(
        _app(repository: repository, webSocket: webSocket),
      );
      await tester.pumpAndSettle();

      expect(find.text('Could not load check-in'), findsOneWidget);
      expect(find.text('Please try again later'), findsOneWidget);

      await tester.tap(find.widgetWithText(ElevatedButton, 'Retry'));
      await tester.pumpAndSettle();

      expect(repository.detailCalls, 2);
      expect(find.text('The Headliners'), findsOneWidget);
      expect(find.text('Could not load check-in'), findsNothing);
    });

    testWidgets('comment failures remain visible while detail stays usable', (
      tester,
    ) async {
      final repository = _DetailRepository(
        commentFailure: const ServerFailure('comments unavailable'),
      );
      final webSocket = _TrackingWebSocketService();
      addTearDown(webSocket.dispose);

      await tester.pumpWidget(
        _app(repository: repository, webSocket: webSocket),
      );
      await tester.pumpAndSettle();

      expect(find.text('Failed to load comments'), findsOneWidget);
      expect(find.text('The Headliners'), findsOneWidget);
      expect(find.byIcon(Icons.send), findsOneWidget);
    });
  });
}

Widget _app({
  required CheckInRepository repository,
  required WebSocketService webSocket,
}) {
  return ProviderScope(
    retry: (_, _) => null,
    overrides: [
      checkInRepositoryProvider.overrideWithValue(repository),
      webSocketServiceProvider.overrideWithValue(webSocket),
      authStateProvider.overrideWithBuild((_, _) async => _currentUser),
    ],
    child: const MaterialApp(home: CheckInDetailScreen(checkinId: 'checkin-1')),
  );
}

const _currentUser = User(
  id: 'user-1',
  email: 'alex@example.com',
  username: 'alex',
  isVerified: true,
  isActive: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
);

CheckIn _completeCheckIn() {
  return const CheckIn(
    id: 'checkin-1',
    userId: 'user-1',
    createdAt: '2026-07-27T20:00:00Z',
    updatedAt: '2026-07-27T20:00:00Z',
    toastCount: 8,
    commentCount: 1,
    bandRating: 4.5,
    venueRating: 4,
    noteText: 'An unforgettable encore',
    eventId: 'event-1',
    event: CheckInEvent(
      id: 'event-1',
      eventDate: '2026-07-27T20:00:00Z',
      band: CheckInBand(id: 'band-1', name: 'The Headliners', genre: 'Rock'),
      venue: CheckInVenue(
        id: 'venue-1',
        name: 'SoundCheck Hall',
        city: 'New York',
        state: 'NY',
      ),
    ),
    user: _currentUser,
    vibeTags: [
      VibeTag(id: 'sound', name: 'great_sound', displayName: 'Great Sound'),
      VibeTag(id: 'mosh', name: 'mosh_pit', displayName: 'Mosh Pit'),
      VibeTag(id: 'lights', name: 'lights', displayName: 'Epic Lights'),
      VibeTag(id: 'crowd', name: 'crowd', displayName: 'Packed Crowd'),
      VibeTag(id: 'stage', name: 'stage', displayName: 'Stage Show'),
      VibeTag(id: 'other', name: 'other', displayName: 'Sing Along'),
    ],
    earnedBadges: [EarnedBadge(id: 'badge-1', name: 'First Show')],
    isVerified: true,
  );
}

class _DetailRepository extends CheckInRepository {
  _DetailRepository({
    List<Either<Failure, CheckIn>>? detailResults,
    this.commentFailure,
  }) : _detailResults = detailResults ?? [Right(_completeCheckIn())],
       super(dioClient: DioClient(secureStorage: const FlutterSecureStorage()));

  final List<Either<Failure, CheckIn>> _detailResults;
  final Failure? commentFailure;
  int detailCalls = 0;
  int commentCalls = 0;
  final List<String> toastedIds = [];
  final List<(String, String)> addedComments = [];

  @override
  Future<Either<Failure, CheckIn>> getCheckInById(String id) async {
    detailCalls++;
    if (_detailResults.length == 1) return _detailResults.single;
    return _detailResults.removeAt(0);
  }

  @override
  Future<Either<Failure, List<CheckInComment>>> getCheckInComments(
    String checkInId, {
    int page = 1,
    int limit = 20,
  }) async {
    commentCalls++;
    if (commentFailure != null) return Left(commentFailure!);
    return const Right([
      CheckInComment(
        id: 'comment-1',
        checkinId: 'checkin-1',
        userId: 'user-1',
        content: 'Earned this encore',
        createdAt: 'invalid-time',
        updatedAt: '2026-07-27T20:00:00Z',
        user: _currentUser,
      ),
    ]);
  }

  @override
  Future<Either<Failure, void>> toastCheckIn(String checkInId) async {
    toastedIds.add(checkInId);
    return const Right(null);
  }

  @override
  Future<Either<Failure, CheckInComment>> addComment(
    String checkInId,
    String comment,
  ) async {
    addedComments.add((checkInId, comment));
    return Right(
      CheckInComment(
        id: 'new-comment',
        checkinId: checkInId,
        userId: 'user-1',
        content: comment,
        createdAt: '2026-07-27T20:00:00Z',
        updatedAt: '2026-07-27T20:00:00Z',
      ),
    );
  }
}

class _TrackingWebSocketService extends WebSocketService {
  final StreamController<Map<String, dynamic>> _toasts =
      StreamController<Map<String, dynamic>>.broadcast();
  final StreamController<Map<String, dynamic>> _comments =
      StreamController<Map<String, dynamic>>.broadcast();
  final List<String> joinedIds = [];
  final List<String> leftIds = [];

  @override
  Stream<Map<String, dynamic>> get toastStream => _toasts.stream;

  @override
  Stream<Map<String, dynamic>> get commentStream => _comments.stream;

  @override
  void joinCheckinRoom(String checkinId) {
    joinedIds.add(checkinId);
  }

  @override
  void leaveCheckinRoom(String checkinId) {
    leftIds.add(checkinId);
  }

  void emitToast(Map<String, dynamic> payload) => _toasts.add(payload);

  void emitComment(Map<String, dynamic> payload) => _comments.add(payload);

  @override
  void dispose() {
    _toasts.close();
    _comments.close();
    super.dispose();
  }
}
