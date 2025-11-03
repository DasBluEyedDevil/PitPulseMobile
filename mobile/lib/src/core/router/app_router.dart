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
        pageBuilder: (context, state) => CustomTransitionPage(
          key: state.pageKey,
          child: const LoginScreen(),
          transitionsBuilder: (context, animation, secondaryAnimation, child) {
            return FadeTransition(opacity: animation, child: child);
          },
        ),
      ),
      GoRoute(
        path: '/register',
        name: 'register',
        pageBuilder: (context, state) => CustomTransitionPage(
          key: state.pageKey,
          child: const RegisterScreen(),
          transitionsBuilder: (context, animation, secondaryAnimation, child) {
            const begin = Offset(1.0, 0.0);
            const end = Offset.zero;
            const curve = Curves.easeInOut;
            var tween = Tween(begin: begin, end: end).chain(
              CurveTween(curve: curve),
            );
            return SlideTransition(
              position: animation.drive(tween),
              child: child,
            );
          },
        ),
      ),

      // Main App Routes
      GoRoute(
        path: '/home',
        name: 'home',
        pageBuilder: (context, state) => CustomTransitionPage(
          key: state.pageKey,
          child: const HomeScreen(),
          transitionsBuilder: (context, animation, secondaryAnimation, child) {
            return FadeTransition(opacity: animation, child: child);
          },
        ),
      ),

      // Venue Routes
      GoRoute(
        path: '/venues',
        name: 'venues',
        pageBuilder: (context, state) => CustomTransitionPage(
          key: state.pageKey,
          child: const VenuesScreen(),
          transitionsBuilder: (context, animation, secondaryAnimation, child) {
            return FadeTransition(opacity: animation, child: child);
          },
        ),
      ),
      GoRoute(
        path: '/venues/:id',
        name: 'venue-detail',
        pageBuilder: (context, state) {
          final venueId = state.pathParameters['id']!;
          return CustomTransitionPage(
            key: state.pageKey,
            child: VenueDetailScreen(venueId: venueId),
            transitionsBuilder: (context, animation, secondaryAnimation, child) {
              const begin = Offset(1.0, 0.0);
              const end = Offset.zero;
              const curve = Curves.easeInOut;
              var tween = Tween(begin: begin, end: end).chain(
                CurveTween(curve: curve),
              );
              return SlideTransition(
                position: animation.drive(tween),
                child: child,
              );
            },
          );
        },
      ),

      // Band Routes
      GoRoute(
        path: '/bands',
        name: 'bands',
        pageBuilder: (context, state) => CustomTransitionPage(
          key: state.pageKey,
          child: const BandsScreen(),
          transitionsBuilder: (context, animation, secondaryAnimation, child) {
            return FadeTransition(opacity: animation, child: child);
          },
        ),
      ),
      GoRoute(
        path: '/bands/:id',
        name: 'band-detail',
        pageBuilder: (context, state) {
          final bandId = state.pathParameters['id']!;
          return CustomTransitionPage(
            key: state.pageKey,
            child: BandDetailScreen(bandId: bandId),
            transitionsBuilder: (context, animation, secondaryAnimation, child) {
              const begin = Offset(1.0, 0.0);
              const end = Offset.zero;
              const curve = Curves.easeInOut;
              var tween = Tween(begin: begin, end: end).chain(
                CurveTween(curve: curve),
              );
              return SlideTransition(
                position: animation.drive(tween),
                child: child,
              );
            },
          );
        },
      ),

      // Profile Route
      GoRoute(
        path: '/profile',
        name: 'profile',
        pageBuilder: (context, state) => CustomTransitionPage(
          key: state.pageKey,
          child: const ProfileScreen(),
          transitionsBuilder: (context, animation, secondaryAnimation, child) {
            return FadeTransition(opacity: animation, child: child);
          },
        ),
      ),

      // Review Routes
      GoRoute(
        path: '/add-review',
        name: 'add-review',
        pageBuilder: (context, state) {
          final venueId = state.uri.queryParameters['venueId'];
          final bandId = state.uri.queryParameters['bandId'];
          return CustomTransitionPage(
            key: state.pageKey,
            child: AddReviewScreen(
              venueId: venueId,
              bandId: bandId,
            ),
            transitionsBuilder: (context, animation, secondaryAnimation, child) {
              const begin = Offset(0.0, 1.0);
              const end = Offset.zero;
              const curve = Curves.easeInOut;
              var tween = Tween(begin: begin, end: end).chain(
                CurveTween(curve: curve),
              );
              return SlideTransition(
                position: animation.drive(tween),
                child: child,
              );
            },
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
