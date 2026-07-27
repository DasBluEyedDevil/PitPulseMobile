import 'package:dartz/dartz.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:soundcheck_flutter/src/core/api/dio_client.dart';
import 'package:soundcheck_flutter/src/core/error/failures.dart';
import 'package:soundcheck_flutter/src/core/providers/providers.dart';
import 'package:soundcheck_flutter/src/features/bands/data/band_repository.dart';
import 'package:soundcheck_flutter/src/features/bands/domain/band.dart';
import 'package:soundcheck_flutter/src/features/checkins/data/checkin_repository.dart';
import 'package:soundcheck_flutter/src/features/checkins/domain/checkin.dart';
import 'package:soundcheck_flutter/src/features/checkins/domain/checkin_comment.dart';
import 'package:soundcheck_flutter/src/features/checkins/domain/toast.dart';
import 'package:soundcheck_flutter/src/features/checkins/domain/vibe_tag.dart';
import 'package:soundcheck_flutter/src/features/checkins/presentation/providers/checkin_providers.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('check-in query providers', () {
    test('map repository data and preserve filter contracts', () async {
      final repository = _FakeCheckInRepository(
        checkIns: [
          _checkIn(
            'checkin-1',
            band: const CheckInBand(id: 'band-1', name: 'First Band'),
          ),
          _checkIn(
            'checkin-2',
            band: const CheckInBand(id: 'band-1', name: 'First Band'),
          ),
          _checkIn(
            'checkin-3',
            band: const CheckInBand(id: 'band-2', name: 'Second Band'),
          ),
        ],
      );
      final container = _container(repository);
      addTearDown(container.dispose);

      expect(await _read(container, vibeTagsProvider), [
        const VibeTag(id: 'vibe-1', name: 'loud', displayName: 'Loud'),
      ]);
      expect(
        await _read(container, bandCheckInsProvider('band-1')),
        hasLength(3),
      );
      expect(
        await _read(container, venueCheckInsProvider('venue-1')),
        hasLength(3),
      );
      expect(
        await _read(container, userCheckInsProvider('user-1')),
        hasLength(3),
      );
      expect(
        (await _read(container, checkInDetailProvider('checkin-1'))).id,
        'checkin-1',
      );
      expect(
        (await _read(container, checkInToastsProvider('checkin-1'))).single.id,
        'toast-1',
      );
      expect(
        (await _read(
          container,
          checkInCommentsProvider('checkin-1'),
        )).single.content,
        'Great set',
      );
      expect(await _read(container, userCheckInStatsProvider('user-1')), {
        'totalCheckins': 3,
      });
      expect(await _read(container, venueRecentBandsProvider('venue-1')), [
        const CheckInBand(id: 'band-1', name: 'First Band'),
        const CheckInBand(id: 'band-2', name: 'Second Band'),
      ]);

      expect(repository.listRequests, [
        const _ListRequest(bandId: 'band-1'),
        const _ListRequest(venueId: 'venue-1'),
        const _ListRequest(userId: 'user-1'),
        const _ListRequest(venueId: 'venue-1', limit: 20),
      ]);
      expect(repository.detailIds, ['checkin-1']);
      expect(repository.toastListIds, ['checkin-1']);
      expect(repository.commentListIds, ['checkin-1']);
      expect(repository.statsUserIds, ['user-1']);
    });

    test(
      'surface repository failures for retry instead of empty data',
      () async {
        final repository = _FakeCheckInRepository(
          queryFailure: const NetworkFailure('offline'),
        );
        final container = _container(repository);
        addTearDown(container.dispose);

        await expectLater(
          _read(container, vibeTagsProvider),
          throwsA(
            isA<Exception>().having(
              (error) => error.toString(),
              'message',
              contains('offline'),
            ),
          ),
        );
        await expectLater(
          _read(container, checkInDetailProvider('missing')),
          throwsA(isA<Exception>()),
        );
        await expectLater(
          _read(container, checkInCommentsProvider('missing')),
          throwsA(isA<Exception>()),
        );
        await expectLater(
          _read(container, userCheckInStatsProvider('user-1')),
          throwsA(isA<Exception>()),
        );
      },
    );

    test('band search query can be updated and cleared', () {
      final container = ProviderContainer();
      addTearDown(container.dispose);
      final subscription = container.listen(
        bandSearchQueryProvider,
        (_, _) {},
        fireImmediately: true,
      );
      addTearDown(subscription.close);

      container.read(bandSearchQueryProvider.notifier).setQuery('turnstile');
      expect(container.read(bandSearchQueryProvider), 'turnstile');

      container.read(bandSearchQueryProvider.notifier).clear();
      expect(container.read(bandSearchQueryProvider), isEmpty);
    });

    test(
      'debounced band search uses the current query and result limit',
      () async {
        final checkInRepository = _FakeCheckInRepository();
        final bandRepository = _FakeBandRepository();
        final container = ProviderContainer(
          overrides: [
            checkInRepositoryProvider.overrideWithValue(checkInRepository),
            bandRepositoryProvider.overrideWithValue(bandRepository),
          ],
          retry: (_, _) => null,
        );
        addTearDown(container.dispose);
        final querySubscription = container.listen(
          bandSearchQueryProvider,
          (_, _) {},
          fireImmediately: true,
        );
        addTearDown(querySubscription.close);
        container.read(bandSearchQueryProvider.notifier).setQuery('headliners');

        final bands = await _read(container, searchBandsForCheckinProvider);

        expect(bands.single.name, 'The Headliners');
        expect(bandRepository.searches, ['headliners']);
        expect(bandRepository.limits, [10]);
      },
    );
  });

  group('check-in command providers', () {
    test('complete successful social and creation commands', () async {
      final repository = _FakeCheckInRepository();
      final container = _container(repository);
      addTearDown(container.dispose);

      final toastSubscription = container.listen(
        toastCheckInProvider,
        (_, _) {},
        fireImmediately: true,
      );
      final addSubscription = container.listen(
        addCommentProvider,
        (_, _) {},
        fireImmediately: true,
      );
      final deleteSubscription = container.listen(
        deleteCommentProvider,
        (_, _) {},
        fireImmediately: true,
      );
      final eventSubscription = container.listen(
        createEventCheckInProvider,
        (_, _) {},
        fireImmediately: true,
      );
      final manualSubscription = container.listen(
        createManualCheckInProvider,
        (_, _) {},
        fireImmediately: true,
      );
      final ratingsSubscription = container.listen(
        submitRatingsProvider,
        (_, _) {},
        fireImmediately: true,
      );
      addTearDown(() {
        toastSubscription.close();
        addSubscription.close();
        deleteSubscription.close();
        eventSubscription.close();
        manualSubscription.close();
        ratingsSubscription.close();
      });

      expect(
        await container
            .read(toastCheckInProvider.notifier)
            .toggle('checkin-1', false),
        isTrue,
      );
      expect(
        await container
            .read(toastCheckInProvider.notifier)
            .toggle('checkin-1', true),
        isFalse,
      );
      expect(
        (await container
                .read(addCommentProvider.notifier)
                .submit('checkin-1', 'Great set'))
            ?.content,
        'Great set',
      );
      expect(
        await container
            .read(deleteCommentProvider.notifier)
            .delete('checkin-1', 'comment-1'),
        isTrue,
      );
      expect(
        (await container
                .read(createEventCheckInProvider.notifier)
                .submit(
                  eventId: 'event-1',
                  locationLat: 40.75,
                  locationLon: -73.98,
                ))
            ?.id,
        'event-checkin',
      );
      expect(
        (await container
                .read(createManualCheckInProvider.notifier)
                .submit(
                  bandId: 'band-1',
                  venueId: 'venue-1',
                  rating: 4.5,
                  comment: 'Great set',
                  vibeTagIds: ['vibe-1'],
                ))
            ?.id,
        'manual-checkin',
      );
      expect(
        (await container
                .read(submitRatingsProvider.notifier)
                .submit(
                  'checkin-1',
                  bandRatings: [
                    {'bandId': 'band-1', 'rating': 4.5},
                  ],
                  venueRating: 4,
                ))
            ?.id,
        'rated-checkin',
      );

      expect(repository.toastedIds, ['checkin-1']);
      expect(repository.untoastedIds, ['checkin-1']);
      expect(repository.deletedComments, [('checkin-1', 'comment-1')]);
      expect(repository.eventIds, ['event-1']);
      expect(repository.manualRequests.single.bandId, 'band-1');
      expect(repository.ratingIds, ['checkin-1']);
      expect(container.read(toastCheckInProvider).hasError, isFalse);
      expect(container.read(addCommentProvider).hasError, isFalse);
    });

    test('keep every command failure observable and retryable', () async {
      final repository = _FakeCheckInRepository(
        commandFailure: const NetworkFailure('offline'),
      );
      final container = _container(repository);
      addTearDown(container.dispose);

      final subscriptions = [
        container.listen(
          toastCheckInProvider,
          (_, _) {},
          fireImmediately: true,
        ),
        container.listen(addCommentProvider, (_, _) {}, fireImmediately: true),
        container.listen(
          deleteCommentProvider,
          (_, _) {},
          fireImmediately: true,
        ),
        container.listen(
          createEventCheckInProvider,
          (_, _) {},
          fireImmediately: true,
        ),
        container.listen(
          createManualCheckInProvider,
          (_, _) {},
          fireImmediately: true,
        ),
        container.listen(
          submitRatingsProvider,
          (_, _) {},
          fireImmediately: true,
        ),
      ];
      addTearDown(() {
        for (final subscription in subscriptions) {
          subscription.close();
        }
      });

      expect(
        await container
            .read(toastCheckInProvider.notifier)
            .toggle('checkin-1', false),
        isFalse,
      );
      expect(container.read(toastCheckInProvider).hasError, isTrue);

      expect(
        await container
            .read(addCommentProvider.notifier)
            .submit('checkin-1', 'Great set'),
        isNull,
      );
      expect(container.read(addCommentProvider).hasError, isTrue);

      expect(
        await container
            .read(deleteCommentProvider.notifier)
            .delete('checkin-1', 'comment-1'),
        isFalse,
      );
      expect(container.read(deleteCommentProvider).hasError, isTrue);

      expect(
        await container
            .read(createEventCheckInProvider.notifier)
            .submit(eventId: 'event-1'),
        isNull,
      );
      expect(container.read(createEventCheckInProvider).hasError, isTrue);

      expect(
        await container
            .read(createManualCheckInProvider.notifier)
            .submit(bandId: 'band-1', venueId: 'venue-1'),
        isNull,
      );
      expect(container.read(createManualCheckInProvider).hasError, isTrue);

      expect(
        await container
            .read(submitRatingsProvider.notifier)
            .submit('checkin-1', venueRating: 4),
        isNull,
      );
      expect(container.read(submitRatingsProvider).hasError, isTrue);
    });
  });
}

ProviderContainer _container(CheckInRepository repository) {
  return ProviderContainer(
    overrides: [checkInRepositoryProvider.overrideWithValue(repository)],
    retry: (_, _) => null,
  );
}

Future<T> _read<T>(ProviderContainer container, dynamic provider) async {
  final subscription = container.listen<dynamic>(
    provider,
    (_, _) {},
    fireImmediately: true,
  );
  try {
    return await container.read(provider.future) as T;
  } finally {
    subscription.close();
  }
}

CheckIn _checkIn(String id, {CheckInBand? band}) {
  return CheckIn(
    id: id,
    userId: 'user-1',
    createdAt: '2026-07-27T20:00:00Z',
    updatedAt: '2026-07-27T20:00:00Z',
    event: band == null
        ? null
        : CheckInEvent(
            id: 'event-$id',
            band: band,
            venue: const CheckInVenue(id: 'venue-1', name: 'The Venue'),
          ),
  );
}

class _ListRequest {
  const _ListRequest({this.venueId, this.bandId, this.userId, this.limit = 20});

  final String? venueId;
  final String? bandId;
  final String? userId;
  final int limit;

  @override
  bool operator ==(Object other) =>
      other is _ListRequest &&
      other.venueId == venueId &&
      other.bandId == bandId &&
      other.userId == userId &&
      other.limit == limit;

  @override
  int get hashCode => Object.hash(venueId, bandId, userId, limit);
}

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

class _FakeCheckInRepository extends CheckInRepository {
  _FakeCheckInRepository({
    this.queryFailure,
    this.commandFailure,
    List<CheckIn>? checkIns,
  }) : checkIns = checkIns ?? [_checkIn('checkin-1')],
       super(dioClient: DioClient(secureStorage: const FlutterSecureStorage()));

  final Failure? queryFailure;
  final Failure? commandFailure;
  final List<CheckIn> checkIns;
  final List<_ListRequest> listRequests = [];
  final List<String> detailIds = [];
  final List<String> toastListIds = [];
  final List<String> commentListIds = [];
  final List<String> statsUserIds = [];
  final List<String> toastedIds = [];
  final List<String> untoastedIds = [];
  final List<(String, String)> deletedComments = [];
  final List<String> eventIds = [];
  final List<_ManualRequest> manualRequests = [];
  final List<String> ratingIds = [];

  Either<Failure, T> _query<T>(T value) =>
      queryFailure == null ? Right(value) : Left(queryFailure!);

  Either<Failure, T> _command<T>(T value) =>
      commandFailure == null ? Right(value) : Left(commandFailure!);

  @override
  Future<Either<Failure, List<VibeTag>>> getVibeTags() async =>
      _query([const VibeTag(id: 'vibe-1', name: 'loud', displayName: 'Loud')]);

  @override
  Future<Either<Failure, List<CheckIn>>> getCheckIns({
    String? venueId,
    String? bandId,
    String? userId,
    int page = 1,
    int limit = 20,
  }) async {
    listRequests.add(
      _ListRequest(
        venueId: venueId,
        bandId: bandId,
        userId: userId,
        limit: limit,
      ),
    );
    return _query(checkIns);
  }

  @override
  Future<Either<Failure, CheckIn>> getCheckInById(String id) async {
    detailIds.add(id);
    return _query(_checkIn(id));
  }

  @override
  Future<Either<Failure, List<Toast>>> getCheckInToasts(
    String checkInId,
  ) async {
    toastListIds.add(checkInId);
    return _query([
      Toast(
        id: 'toast-1',
        userId: 'user-2',
        checkinId: checkInId,
        createdAt: '2026-07-27T20:00:00Z',
      ),
    ]);
  }

  @override
  Future<Either<Failure, List<CheckInComment>>> getCheckInComments(
    String checkInId, {
    int page = 1,
    int limit = 20,
  }) async {
    commentListIds.add(checkInId);
    return _query([
      CheckInComment(
        id: 'comment-1',
        checkinId: checkInId,
        userId: 'user-2',
        content: 'Great set',
        createdAt: '2026-07-27T20:00:00Z',
        updatedAt: '2026-07-27T20:00:00Z',
      ),
    ]);
  }

  @override
  Future<Either<Failure, Map<String, dynamic>>> getUserStats(
    String userId,
  ) async {
    statsUserIds.add(userId);
    return _query({'totalCheckins': 3});
  }

  @override
  Future<Either<Failure, void>> toastCheckIn(String checkInId) async {
    toastedIds.add(checkInId);
    return _command(null);
  }

  @override
  Future<Either<Failure, void>> untoastCheckIn(String checkInId) async {
    untoastedIds.add(checkInId);
    return _command(null);
  }

  @override
  Future<Either<Failure, CheckInComment>> addComment(
    String checkInId,
    String comment,
  ) async {
    return _command(
      CheckInComment(
        id: 'comment-1',
        checkinId: checkInId,
        userId: 'user-1',
        content: comment,
        createdAt: '2026-07-27T20:00:00Z',
        updatedAt: '2026-07-27T20:00:00Z',
      ),
    );
  }

  @override
  Future<Either<Failure, void>> deleteComment(
    String checkInId,
    String commentId,
  ) async {
    deletedComments.add((checkInId, commentId));
    return _command(null);
  }

  @override
  Future<Either<Failure, CheckIn>> createEventCheckIn({
    required String eventId,
    double? locationLat,
    double? locationLon,
  }) async {
    eventIds.add(eventId);
    return _command(_checkIn('event-checkin'));
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
    return _command(_checkIn('manual-checkin'));
  }

  @override
  Future<Either<Failure, CheckIn>> submitRatings(
    String checkinId, {
    List<Map<String, dynamic>>? bandRatings,
    double? venueRating,
  }) async {
    ratingIds.add(checkinId);
    return _command(_checkIn('rated-checkin'));
  }
}

class _FakeBandRepository extends BandRepository {
  _FakeBandRepository()
    : super(dioClient: DioClient(secureStorage: const FlutterSecureStorage()));

  final List<String?> searches = [];
  final List<int> limits = [];

  @override
  Future<Either<Failure, List<Band>>> getBands({
    String? search,
    String? genre,
    String? hometown,
    double? minRating,
    String? sortBy,
    int page = 1,
    int limit = 20,
  }) async {
    searches.add(search);
    limits.add(limit);
    return const Right([
      Band(
        id: 'band-1',
        name: 'The Headliners',
        averageRating: 4.5,
        isActive: true,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      ),
    ]);
  }
}
