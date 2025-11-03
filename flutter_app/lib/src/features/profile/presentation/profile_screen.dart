import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/providers/providers.dart';
import '../../badges/domain/badge.dart';

final myBadgesProvider = FutureProvider<List<UserBadge>>((ref) async {
  final repository = ref.watch(badgeRepositoryProvider);
  return repository.getMyBadges();
});

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authStateProvider);
    final badgesAsync = ref.watch(myBadgesProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Profile'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () async {
              await ref.read(authStateProvider.notifier).logout();
              if (context.mounted) {
                context.go('/login');
              }
            },
          ),
        ],
      ),
      body: authState.when(
        data: (user) => user == null
            ? const Center(child: Text('Not logged in'))
            : RefreshIndicator(
                onRefresh: () async {
                  ref.invalidate(myBadgesProvider);
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
                                '${user.firstName ?? ''} ${user.lastName ?? ''}'.trim(),
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
                          ],
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
                            ? const Center(
                                child: Padding(
                                  padding: EdgeInsets.all(AppTheme.spacing24),
                                  child: Text('No badges earned yet'),
                                ),
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
                                                      badge!.color!
                                                          .replaceFirst(
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
                          child: Text('Error loading badges: $error'),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(child: Text('Error: $error')),
      ),
    );
  }
}
