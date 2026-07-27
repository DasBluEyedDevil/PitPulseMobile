import 'package:dartz/dartz.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:soundcheck_flutter/src/core/api/dio_client.dart';
import 'package:soundcheck_flutter/src/core/error/failures.dart';
import 'package:soundcheck_flutter/src/features/onboarding/data/onboarding_repository.dart';
import 'package:soundcheck_flutter/src/features/onboarding/presentation/onboarding_provider.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('GenrePersistence session synchronization', () {
    test(
      'keeps saved genres and surfaces a server failure for retry',
      () async {
        SharedPreferences.setMockInitialValues({
          'pending_genre_preferences': '["rock","jazz","metal"]',
        });
        final repository = _FakeOnboardingRepository(
          saveResult: const Left(ServerFailure('genre sync unavailable')),
        );
        final container = ProviderContainer(
          overrides: [
            onboardingRepositoryProvider.overrideWithValue(repository),
          ],
        );
        addTearDown(container.dispose);

        await expectLater(
          container
              .read(genrePersistenceProvider.notifier)
              .syncGenresToBackendIfNeeded(),
          throwsA(
            isA<Exception>().having(
              (error) => error.toString(),
              'message',
              contains('genre sync unavailable'),
            ),
          ),
        );

        expect(
          await container
              .read(genrePersistenceProvider.notifier)
              .hasPendingGenres(),
          isTrue,
        );
        expect(repository.completedCalls, 0);
      },
    );

    test('clears saved genres only after both server writes succeed', () async {
      SharedPreferences.setMockInitialValues({
        'pending_genre_preferences': '["rock","jazz","metal"]',
      });
      final repository = _FakeOnboardingRepository();
      final container = ProviderContainer(
        overrides: [onboardingRepositoryProvider.overrideWithValue(repository)],
      );
      addTearDown(container.dispose);

      await container
          .read(genrePersistenceProvider.notifier)
          .syncGenresToBackendIfNeeded();

      expect(
        await container
            .read(genrePersistenceProvider.notifier)
            .hasPendingGenres(),
        isFalse,
      );
      expect(repository.savedGenres, [
        ['rock', 'jazz', 'metal'],
      ]);
      expect(repository.completedCalls, 1);
    });
  });
}

class _FakeOnboardingRepository extends OnboardingRepository {
  _FakeOnboardingRepository({this.saveResult = const Right(null)})
    : super(dioClient: DioClient(secureStorage: const FlutterSecureStorage()));

  final Either<Failure, void> saveResult;
  final savedGenres = <List<String>>[];
  int completedCalls = 0;

  @override
  Future<Either<Failure, void>> saveGenrePreferences(
    List<String> genres,
  ) async {
    savedGenres.add([...genres]);
    return saveResult;
  }

  @override
  Future<Either<Failure, void>> completeOnboarding() async {
    completedCalls++;
    return const Right(null);
  }
}
