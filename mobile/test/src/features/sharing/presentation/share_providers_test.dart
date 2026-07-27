import 'package:dartz/dartz.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:soundcheck_flutter/src/core/api/dio_client.dart';
import 'package:soundcheck_flutter/src/core/error/failures.dart';
import 'package:soundcheck_flutter/src/features/sharing/data/share_repository.dart';
import 'package:soundcheck_flutter/src/features/sharing/presentation/share_providers.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('share-card providers', () {
    test('check-in provider exposes generated URLs', () async {
      final repository = _SequencedShareRepository(
        checkinResults: [
          const Right(
            ShareCardUrls(
              ogUrl: 'https://cdn.example/checkin-og.png',
              storiesUrl: 'https://cdn.example/checkin-stories.png',
            ),
          ),
        ],
      );
      final container = ProviderContainer(
        overrides: [shareRepositoryProvider.overrideWithValue(repository)],
        retry: (_, _) => null,
      );
      addTearDown(container.dispose);
      final provider = checkinCardProvider('checkin-1');
      final subscription = container.listen(
        provider,
        (_, _) {},
        fireImmediately: true,
      );
      addTearDown(subscription.close);

      final urls = await container.read(provider.future);

      expect(repository.checkinIds, ['checkin-1']);
      expect(urls.ogUrl, 'https://cdn.example/checkin-og.png');
      expect(urls.storiesUrl, 'https://cdn.example/checkin-stories.png');
    });

    test('badge provider makes a domain failure observable', () async {
      final repository = _SequencedShareRepository(
        badgeResults: [const Left(ServerFailure('renderer unavailable'))],
      );
      final container = ProviderContainer(
        overrides: [shareRepositoryProvider.overrideWithValue(repository)],
        retry: (_, _) => null,
      );
      addTearDown(container.dispose);
      final provider = badgeCardProvider('award-1');
      final subscription = container.listen(
        provider,
        (_, _) {},
        fireImmediately: true,
      );
      addTearDown(subscription.close);

      await expectLater(
        container.read(provider.future),
        throwsA(
          isA<Exception>().having(
            (error) => error.toString(),
            'message',
            contains('renderer unavailable'),
          ),
        ),
      );
      expect(repository.badgeAwardIds, ['award-1']);
    });

    test('a failed request follows retry policy and can recover', () async {
      final repository = _SequencedShareRepository(
        checkinResults: [
          const Left(NetworkFailure('offline')),
          const Right(
            ShareCardUrls(
              ogUrl: 'https://cdn.example/recovered-og.png',
              storiesUrl: 'https://cdn.example/recovered-stories.png',
            ),
          ),
        ],
      );
      final container = ProviderContainer(
        overrides: [shareRepositoryProvider.overrideWithValue(repository)],
        retry: (retryCount, _) => retryCount == 0 ? Duration.zero : null,
      );
      addTearDown(container.dispose);
      final provider = checkinCardProvider('checkin-retry');
      final subscription = container.listen(
        provider,
        (_, _) {},
        fireImmediately: true,
      );
      addTearDown(subscription.close);

      final urls = await container.read(provider.future);

      expect(repository.checkinIds, ['checkin-retry', 'checkin-retry']);
      expect(urls.ogUrl, 'https://cdn.example/recovered-og.png');
    });
  });
}

class _SequencedShareRepository extends ShareRepository {
  _SequencedShareRepository({
    List<Either<Failure, ShareCardUrls>> checkinResults = const [],
    List<Either<Failure, ShareCardUrls>> badgeResults = const [],
  }) : _checkinResults = [...checkinResults],
       _badgeResults = [...badgeResults],
       super(DioClient(secureStorage: const FlutterSecureStorage()));

  final List<Either<Failure, ShareCardUrls>> _checkinResults;
  final List<Either<Failure, ShareCardUrls>> _badgeResults;
  final List<String> checkinIds = [];
  final List<String> badgeAwardIds = [];

  @override
  Future<Either<Failure, ShareCardUrls>> generateCheckinCard(
    String checkinId,
  ) async {
    checkinIds.add(checkinId);
    return _checkinResults.removeAt(0);
  }

  @override
  Future<Either<Failure, ShareCardUrls>> generateBadgeCard(
    String badgeAwardId,
  ) async {
    badgeAwardIds.add(badgeAwardId);
    return _badgeResults.removeAt(0);
  }
}
