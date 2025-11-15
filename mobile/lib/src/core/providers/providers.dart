import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../api/dio_client.dart';
import '../../features/auth/data/auth_repository.dart';
import '../../features/auth/domain/user.dart';
import '../../features/venues/data/venue_repository.dart';
import '../../features/bands/data/band_repository.dart';
import '../../features/reviews/data/review_repository.dart';
import '../../features/badges/data/badge_repository.dart';

// Secure Storage Provider
final secureStorageProvider = Provider<FlutterSecureStorage>((ref) {
  return const FlutterSecureStorage();
});

// Dio Client Provider
final dioClientProvider = Provider<DioClient>((ref) {
  final secureStorage = ref.watch(secureStorageProvider);
  return DioClient(secureStorage: secureStorage);
});

// Repository Providers
final authRepositoryProvider = Provider<AuthRepository>((ref) {
  final dioClient = ref.watch(dioClientProvider);
  final secureStorage = ref.watch(secureStorageProvider);
  return AuthRepository(
    dioClient: dioClient,
    secureStorage: secureStorage,
  );
});

final venueRepositoryProvider = Provider<VenueRepository>((ref) {
  final dioClient = ref.watch(dioClientProvider);
  return VenueRepository(dioClient: dioClient);
});

final bandRepositoryProvider = Provider<BandRepository>((ref) {
  final dioClient = ref.watch(dioClientProvider);
  return BandRepository(dioClient: dioClient);
});

final reviewRepositoryProvider = Provider<ReviewRepository>((ref) {
  final dioClient = ref.watch(dioClientProvider);
  return ReviewRepository(dioClient: dioClient);
});

final badgeRepositoryProvider = Provider<BadgeRepository>((ref) {
  final dioClient = ref.watch(dioClientProvider);
  return BadgeRepository(dioClient: dioClient);
});

final profileRepositoryProvider = Provider((ref) {
  // Dynamically import to avoid circular dependency issues
  return null; // ProfileRepository will be used directly in providers
});

// Auth State Provider
final authStateProvider = StateNotifierProvider<AuthStateNotifier, AsyncValue<User?>>((ref) {
  final authRepository = ref.watch(authRepositoryProvider);
  return AuthStateNotifier(authRepository);
});

/// Auth State Notifier manages authentication state
class AuthStateNotifier extends StateNotifier<AsyncValue<User?>> {
  final AuthRepository _authRepository;

  AuthStateNotifier(this._authRepository) : super(const AsyncValue.loading()) {
    _init();
  }

  Future<void> _init() async {
    try {
      final user = await _authRepository.getCurrentUser();
      state = AsyncValue.data(user);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> login(String email, String password) async {
    state = const AsyncValue.loading();
    try {
      final authResponse = await _authRepository.login(
        LoginRequest(email: email, password: password),
      );
      state = AsyncValue.data(authResponse.user);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      rethrow;
    }
  }

  Future<void> register({
    required String email,
    required String password,
    required String username,
    String? firstName,
    String? lastName,
  }) async {
    state = const AsyncValue.loading();
    try {
      final authResponse = await _authRepository.register(
        RegisterRequest(
          email: email,
          password: password,
          username: username,
          firstName: firstName,
          lastName: lastName,
        ),
      );
      state = AsyncValue.data(authResponse.user);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      rethrow;
    }
  }

  Future<void> logout() async {
    await _authRepository.logout();
    state = const AsyncValue.data(null);
  }

  Future<void> refreshUser() async {
    try {
      final user = await _authRepository.getMe();
      state = AsyncValue.data(user);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }
}
