import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../providers/providers.dart';
import '../../features/auth/presentation/login_screen.dart';
import '../../features/auth/presentation/register_screen.dart';
import '../../features/home/presentation/home_screen.dart';
import '../../features/venues/presentation/venues_screen.dart';
import '../../features/venues/presentation/venue_detail_screen.dart';
import '../../features/bands/presentation/bands_screen.dart';
import '../../features/bands/presentation/band_detail_screen.dart';
import '../../features/profile/presentation/profile_screen.dart';
import '../../features/reviews/presentation/add_review_screen.dart';

/// App Router Provider
final appRouterProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authStateProvider);

  return GoRouter(
    initialLocation: '/splash',
    redirect: (context, state) {
      final isLoading = authState is AsyncLoading;
      final isAuthenticated = authState.value != null;
      final isOnAuthPage = state.matchedLocation.startsWith('/login') ||
          state.matchedLocation.startsWith('/register');

      if (isLoading) {
        return '/splash';
      }

      if (!isAuthenticated && !isOnAuthPage) {
        return '/login';
      }

      if (isAuthenticated && isOnAuthPage) {
        return '/home';
      }

      if (state.matchedLocation == '/splash') {
        return isAuthenticated ? '/home' : '/login';
      }

      return null;
    },
    refreshListenable: GoRouterRefreshStream(ref, authStateProvider),
    routes: [
      // Splash Route (for loading state)
      GoRoute(
        path: '/splash',
        builder: (context, state) => const Scaffold(
          body: Center(
            child: CircularProgressIndicator(),
          ),
        ),
      ),

      // Auth Routes
      GoRoute(
        path: '/login',
        name: 'login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/register',
        name: 'register',
        builder: (context, state) => const RegisterScreen(),
      ),

      // Main App Routes
      GoRoute(
        path: '/home',
        name: 'home',
        builder: (context, state) => const HomeScreen(),
      ),

      // Venue Routes
      GoRoute(
        path: '/venues',
        name: 'venues',
        builder: (context, state) => const VenuesScreen(),
      ),
      GoRoute(
        path: '/venues/:id',
        name: 'venue-detail',
        builder: (context, state) {
          final venueId = state.pathParameters['id']!;
          return VenueDetailScreen(venueId: venueId);
        },
      ),

      // Band Routes
      GoRoute(
        path: '/bands',
        name: 'bands',
        builder: (context, state) => const BandsScreen(),
      ),
      GoRoute(
        path: '/bands/:id',
        name: 'band-detail',
        builder: (context, state) {
          final bandId = state.pathParameters['id']!;
          return BandDetailScreen(bandId: bandId);
        },
      ),

      // Profile Route
      GoRoute(
        path: '/profile',
        name: 'profile',
        builder: (context, state) => const ProfileScreen(),
      ),

      // Review Routes
      GoRoute(
        path: '/add-review',
        name: 'add-review',
        builder: (context, state) {
          final venueId = state.uri.queryParameters['venueId'];
          final bandId = state.uri.queryParameters['bandId'];
          return AddReviewScreen(
            venueId: venueId,
            bandId: bandId,
          );
        },
      ),
    ],
  );
});

/// Custom GoRouter refresh stream that listens to auth state changes
class GoRouterRefreshStream extends ChangeNotifier {
  GoRouterRefreshStream(this._ref, this._provider) {
    _ref.listen(_provider, (_, __) {
      notifyListeners();
    });
  }

  final Ref _ref;
  final ProviderListenable<AsyncValue> _provider;
}
