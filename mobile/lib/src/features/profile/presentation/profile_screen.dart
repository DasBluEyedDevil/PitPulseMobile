import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/theme_provider.dart';
import '../../../core/providers/providers.dart';
import '../../../shared/utils/haptic_feedback.dart';
import '../../../shared/widgets/profile_skeleton.dart';
import '../../../shared/widgets/empty_state_widget.dart';
import '../../../shared/widgets/error_state_widget.dart';
import '../../badges/domain/badge.dart';
import '../../reviews/domain/review.dart';
import '../domain/user_statistics.dart';

final myBadgesProvider = FutureProvider.autoDispose<List<UserBadge>>((ref) async {
  final repository = ref.watch(badgeRepositoryProvider);
  return repository.getMyBadges();
});

final userStatisticsProvider = FutureProvider.autoDispose<UserStatistics>((ref) async {
  // Mock data for now - in a real app, this would call the API
  final user = ref.watch(authStateProvider).value;
  final badges = await ref.watch(myBadgesProvider.future);
  final reviews = await ref.watch(reviewRepositoryProvider).getReviews(userId: user?.id);

  // Calculate statistics
  final now = DateTime.now();
  final thisMonth = reviews.where((r) {
    final createdAt = DateTime.parse(r.createdAt);
    return createdAt.year == now.year && createdAt.month == now.month;
  }).length;

  final thisYear = reviews.where((r) {
    final createdAt = DateTime.parse(r.createdAt);
    return createdAt.year == now.year;
  }).length;

  final avgRating = reviews.isEmpty
      ? 0.0
      : reviews.map((r) => r.rating).reduce((a, b) => a + b) / reviews.length;

  return UserStatistics(
    totalReviews: reviews.length,
    averageRating: avgRating,
    badgesCount: badges.length,
    reviewsThisMonth: thisMonth,
    reviewsThisYear: thisYear,
    memberSince: user?.createdAt ?? DateTime.now().toIso8601String(),
  );
});

final recentReviewsProvider = FutureProvider.autoDispose<List<Review>>((ref) async {
  final user = ref.watch(authStateProvider).value;
  if (user == null) return [];

  final reviews = await ref.watch(reviewRepositoryProvider).getReviews(
    userId: user.id,
    limit: 3,
  );
  return reviews;
});

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authStateProvider);
    final badgesAsync = ref.watch(myBadgesProvider);
    final statisticsAsync = ref.watch(userStatisticsProvider);
    final recentReviewsAsync = ref.watch(recentReviewsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Profile'),
        actions: [
          IconButton(
            icon: const Icon(Icons.settings),
            onPressed: () {
              HapticFeedbackUtil.selectionClick();
              context.push('/profile/settings');
            },
            tooltip: 'Settings',
          ),
          IconButton(
            icon: const Icon(Icons.edit),
            onPressed: () {
              HapticFeedbackUtil.selectionClick();
              context.push('/profile/edit');
            },
            tooltip: 'Edit Profile',
          ),
        ],
      ),
      body: authState.when(
        data: (user) => user == null
            ? const Center(child: Text('Not logged in'))
            : RefreshIndicator(
                onRefresh: () async {
                  ref.invalidate(myBadgesProvider);
                  ref.invalidate(userStatisticsProvider);
                  ref.invalidate(recentReviewsProvider);
                  await ref.read(authStateProvider.notifier).refreshUser();
                },
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(AppTheme.spacing16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Profile Header
                      Center(
                        child: Column(
                          children: [
                            CircleAvatar(
                              radius: 50,
                              backgroundColor: AppTheme.primary,
                              backgroundImage: user.profileImageUrl != null
                                  ? NetworkImage(user.profileImageUrl!)
                                  : null,
                              child: user.profileImageUrl == null
                                  ? Text(
                                      user.username[0].toUpperCase(),
                                      style: const TextStyle(
                                        fontSize: 32,
                                        color: Colors.white,
                                      ),
                                    )
                                  : null,
                            ),
                            const SizedBox(height: AppTheme.spacing16),
                            Text(
                              user.username,
                              style: Theme.of(context).textTheme.displaySmall,
                            ),
                            if (user.firstName != null || user.lastName != null)
                              Text(
                                '${user.firstName ?? ''} ${user.lastName ?? ''}'
                                    .trim(),
                                style: Theme.of(context).textTheme.titleMedium,
                              ),
                            if (user.email.isNotEmpty)
                              Padding(
                                padding: const EdgeInsets.only(
                                  top: AppTheme.spacing8,
                                ),
                                child: Text(
                                  user.email,
                                  style: Theme.of(context).textTheme.bodyMedium,
                                ),
                              ),
                            if (user.bio != null && user.bio!.isNotEmpty)
                              Padding(
                                padding: const EdgeInsets.only(
                                  top: AppTheme.spacing8,
                                ),
                                child: Text(
                                  user.bio!,
                                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                        color: Colors.grey[600],
                                      ),
                                  textAlign: TextAlign.center,
                                ),
                              ),
                          ],
                        ),
                      ),
                      const SizedBox(height: AppTheme.spacing32),

                      // Statistics Section
                      Text(
                        'Statistics',
                        style: Theme.of(context).textTheme.headlineSmall,
                      ),
                      const SizedBox(height: AppTheme.spacing16),
                      statisticsAsync.when(
                        data: (stats) => Card(
                          child: Padding(
                            padding: const EdgeInsets.all(AppTheme.spacing16),
                            child: Column(
                              children: [
                                Row(
                                  children: [
                                    Expanded(
                                      child: _StatisticItem(
                                        icon: Icons.rate_review,
                                        label: 'Total Reviews',
                                        value: stats.totalReviews.toString(),
                                        color: AppTheme.primary,
                                      ),
                                    ),
                                    const SizedBox(width: AppTheme.spacing8),
                                    Expanded(
                                      child: _StatisticItem(
                                        icon: Icons.star,
                                        label: 'Avg Rating',
                                        value: stats.averageRating.toStringAsFixed(1),
                                        color: AppTheme.warning,
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: AppTheme.spacing16),
                                Row(
                                  children: [
                                    Expanded(
                                      child: _StatisticItem(
                                        icon: Icons.emoji_events,
                                        label: 'Badges',
                                        value: stats.badgesCount.toString(),
                                        color: AppTheme.success,
                                      ),
                                    ),
                                    const SizedBox(width: AppTheme.spacing8),
                                    Expanded(
                                      child: _StatisticItem(
                                        icon: Icons.calendar_today,
                                        label: 'Member Since',
                                        value: DateFormat('MMM yyyy').format(
                                          DateTime.parse(stats.memberSince),
                                        ),
                                        color: AppTheme.info,
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: AppTheme.spacing16),
                                Row(
                                  children: [
                                    Expanded(
                                      child: _StatisticItem(
                                        icon: Icons.today,
                                        label: 'This Month',
                                        value: stats.reviewsThisMonth.toString(),
                                        color: Colors.purple,
                                      ),
                                    ),
                                    const SizedBox(width: AppTheme.spacing8),
                                    Expanded(
                                      child: _StatisticItem(
                                        icon: Icons.calendar_month,
                                        label: 'This Year',
                                        value: stats.reviewsThisYear.toString(),
                                        color: Colors.orange,
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ),
                        loading: () => const Card(
                          child: Padding(
                            padding: EdgeInsets.all(AppTheme.spacing32),
                            child: Center(child: CircularProgressIndicator()),
                          ),
                        ),
                        error: (error, _) => Card(
                          child: Padding(
                            padding: const EdgeInsets.all(AppTheme.spacing16),
                            child: Center(
                              child: Text('Could not load statistics'),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: AppTheme.spacing32),

                      // My Reviews Section
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'My Reviews',
                            style: Theme.of(context).textTheme.headlineSmall,
                          ),
                          TextButton(
                            onPressed: () {
                              HapticFeedbackUtil.selectionClick();
                              context.push('/profile/my-reviews');
                            },
                            child: const Text('See All'),
                          ),
                        ],
                      ),
                      const SizedBox(height: AppTheme.spacing16),
                      recentReviewsAsync.when(
                        data: (reviews) {
                          if (reviews.isEmpty) {
                            return Card(
                              child: Padding(
                                padding: const EdgeInsets.all(AppTheme.spacing24),
                                child: Center(
                                  child: Column(
                                    children: [
                                      Icon(
                                        Icons.rate_review_outlined,
                                        size: 48,
                                        color: Colors.grey[400],
                                      ),
                                      const SizedBox(height: AppTheme.spacing8),
                                      Text(
                                        'No reviews yet',
                                        style: Theme.of(context)
                                            .textTheme
                                            .bodyLarge
                                            ?.copyWith(
                                              color: Colors.grey[600],
                                            ),
                                      ),
                                      const SizedBox(height: AppTheme.spacing4),
                                      Text(
                                        'Start reviewing venues and bands!',
                                        style: Theme.of(context)
                                            .textTheme
                                            .bodySmall
                                            ?.copyWith(
                                              color: Colors.grey[500],
                                            ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            );
                          }

                          return Column(
                            children: reviews
                                .map((review) => _ReviewPreviewCard(review: review))
                                .toList(),
                          );
                        },
                        loading: () => const Card(
                          child: Padding(
                            padding: EdgeInsets.all(AppTheme.spacing32),
                            child: Center(child: CircularProgressIndicator()),
                          ),
                        ),
                        error: (error, _) => Card(
                          child: Padding(
                            padding: const EdgeInsets.all(AppTheme.spacing16),
                            child: Center(
                              child: Text('Could not load reviews'),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: AppTheme.spacing32),

                      // Badges Section
                      Text(
                        'My Badges',
                        style: Theme.of(context).textTheme.headlineSmall,
                      ),
                      const SizedBox(height: AppTheme.spacing16),
                      badgesAsync.when(
                        data: (badges) => badges.isEmpty
                            ? EmptyStateWidget(
                                type: EmptyStateType.noBadges,
                                onAction: () => context.go('/venues'),
                              )
                            : GridView.builder(
                                shrinkWrap: true,
                                physics: const NeverScrollableScrollPhysics(),
                                gridDelegate:
                                    const SliverGridDelegateWithFixedCrossAxisCount(
                                  crossAxisCount: 3,
                                  crossAxisSpacing: AppTheme.spacing16,
                                  mainAxisSpacing: AppTheme.spacing16,
                                ),
                                itemCount: badges.length,
                                itemBuilder: (context, index) {
                                  final userBadge = badges[index];
                                  final badge = userBadge.badge;
                                  return Card(
                                    child: Padding(
                                      padding: const EdgeInsets.all(
                                        AppTheme.spacing8,
                                      ),
                                      child: Column(
                                        mainAxisAlignment:
                                            MainAxisAlignment.center,
                                        children: [
                                          Icon(
                                            Icons.emoji_events,
                                            size: 32,
                                            color: badge?.color != null
                                                ? Color(
                                                    int.parse(
                                                      badge!.color!.replaceFirst(
                                                        '#',
                                                        '0xFF',
                                                      ),
                                                    ),
                                                  )
                                                : AppTheme.warning,
                                          ),
                                          const SizedBox(height: AppTheme.spacing4),
                                          Text(
                                            badge?.name ?? 'Badge',
                                            style: Theme.of(context)
                                                .textTheme
                                                .bodySmall,
                                            textAlign: TextAlign.center,
                                            maxLines: 2,
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        ],
                                      ),
                                    ),
                                  );
                                },
                              ),
                        loading: () => const Center(
                          child: CircularProgressIndicator(),
                        ),
                        error: (error, _) => Center(
                          child: Column(
                            children: [
                              const Text('Could not load badges'),
                              const SizedBox(height: AppTheme.spacing8),
                              TextButton.icon(
                                onPressed: () => ref.invalidate(myBadgesProvider),
                                icon: const Icon(Icons.refresh),
                                label: const Text('Retry'),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
        loading: () => const ProfileSkeleton(),
        error: (error, stackTrace) => ErrorStateWidget(
          error: error,
          stackTrace: stackTrace,
          onRetry: () => ref.invalidate(authStateProvider),
        ),
      ),
    );
  }
}

class _StatisticItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color color;

  const _StatisticItem({
    required this.icon,
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppTheme.spacing12),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        children: [
          Icon(icon, color: color, size: 28),
          const SizedBox(height: AppTheme.spacing8),
          Text(
            value,
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: color,
                ),
          ),
          const SizedBox(height: AppTheme.spacing4),
          Text(
            label,
            style: Theme.of(context).textTheme.bodySmall,
            textAlign: TextAlign.center,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }
}

class _ReviewPreviewCard extends StatelessWidget {
  final Review review;

  const _ReviewPreviewCard({required this.review});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: AppTheme.spacing8),
      child: InkWell(
        onTap: () {
          HapticFeedbackUtil.selectionClick();
          if (review.venueId != null) {
            context.push('/venues/${review.venueId}');
          } else if (review.bandId != null) {
            context.push('/bands/${review.bandId}');
          }
        },
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(AppTheme.spacing12),
          child: Row(
            children: [
              // Rating
              Container(
                padding: const EdgeInsets.all(AppTheme.spacing8),
                decoration: BoxDecoration(
                  color: AppTheme.warning.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    const Icon(
                      Icons.star,
                      color: AppTheme.warning,
                      size: 16,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      review.rating.toStringAsFixed(1),
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: AppTheme.spacing12),
              // Venue/Band info
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (review.venue != null)
                      Text(
                        review.venue!.name,
                        style: Theme.of(context).textTheme.titleSmall,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      )
                    else if (review.band != null)
                      Text(
                        review.band!.name,
                        style: Theme.of(context).textTheme.titleSmall,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    if (review.title != null && review.title!.isNotEmpty)
                      Text(
                        review.title!,
                        style: Theme.of(context).textTheme.bodySmall,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right, size: 20),
            ],
          ),
        ),
      ),
    );
  }
}
