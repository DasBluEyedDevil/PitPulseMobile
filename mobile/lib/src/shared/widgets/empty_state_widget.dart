import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import 'brand_widgets.dart';

/// Type of empty state to display
enum EmptyStateType {
  noVenues,
  noBands,
  noCheckins,
  noBadges,
  noSearchResults,
  noNotifications,
  noFriends,
  noEvents,
  general,
}

/// A reusable widget for displaying empty states with illustrations and CTAs
class EmptyStateWidget extends StatelessWidget {
  final EmptyStateType type;
  final String? customTitle;
  final String? customMessage;
  final String? actionLabel;
  final VoidCallback? onAction;

  const EmptyStateWidget({
    required this.type,
    super.key,
    this.customTitle,
    this.customMessage,
    this.actionLabel,
    this.onAction,
  });

  @override
  Widget build(BuildContext context) {
    final config = _getConfig();

    return FlashEmptyState(
      title: customTitle ?? config.title,
      message: customMessage ?? config.message,
      actionLabel: onAction == null ? null : actionLabel ?? config.actionLabel,
      onAction: onAction,
    );
  }

  _EmptyStateConfig _getConfig() {
    switch (type) {
      case EmptyStateType.noVenues:
        return _EmptyStateConfig(
          icon: Icons.location_city_outlined,
          color: AppTheme.primary,
          title: 'No Venues Found',
          message:
              'There are no venues available yet. Check back later or explore other areas!',
          actionLabel: 'Refresh',
          actionIcon: Icons.refresh,
        );
      case EmptyStateType.noBands:
        return _EmptyStateConfig(
          icon: Icons.music_note_outlined,
          color: AppTheme.primary,
          title: 'No Bands Found',
          message:
              'There are no bands available yet. Check back later or explore different genres!',
          actionLabel: 'Refresh',
          actionIcon: Icons.refresh,
        );
      case EmptyStateType.noCheckins:
        return _EmptyStateConfig(
          icon: Icons.music_note_outlined,
          color: AppTheme.voltLime,
          title: 'No Check-ins Yet',
          message:
              'Be the first to check in! Share your concert experience with the community.',
          actionLabel: 'Check In',
          actionIcon: Icons.add,
        );
      case EmptyStateType.noBadges:
        return _EmptyStateConfig(
          icon: Icons.emoji_events_outlined,
          color: AppTheme.toastGold,
          title: 'No Badges Earned Yet',
          message:
              'Start checking in to concerts and shows to earn badges! Complete challenges to unlock achievements.',
          actionLabel: 'Discover',
          actionIcon: Icons.explore,
        );
      case EmptyStateType.noSearchResults:
        return _EmptyStateConfig(
          icon: Icons.search_off_outlined,
          color: AppTheme.textSecondary,
          title: 'No Results Found',
          message:
              'We couldn\'t find what you\'re looking for. Try different keywords or browse all venues and bands.',
          actionLabel: 'Clear Search',
          actionIcon: Icons.clear,
        );
      case EmptyStateType.noNotifications:
        return _EmptyStateConfig(
          icon: Icons.notifications_none_outlined,
          color: AppTheme.textSecondary,
          title: 'No Notifications',
          message: 'You\'re all caught up! New activity will appear here.',
          actionLabel: 'Refresh',
          actionIcon: Icons.refresh,
        );
      case EmptyStateType.noFriends:
        return _EmptyStateConfig(
          icon: Icons.people_outline,
          color: AppTheme.primary,
          title: 'No Friends Yet',
          message: 'Follow other users to see their activity in your feed!',
          actionLabel: 'Find Friends',
          actionIcon: Icons.person_add,
        );
      case EmptyStateType.noEvents:
        return _EmptyStateConfig(
          icon: Icons.event_outlined,
          color: AppTheme.primary,
          title: 'No Events Found',
          message:
              'There are no upcoming events in your area. Check back later!',
          actionLabel: 'Refresh',
          actionIcon: Icons.refresh,
        );
      case EmptyStateType.general:
        return _EmptyStateConfig(
          icon: Icons.inbox_outlined,
          color: AppTheme.textSecondary,
          title: 'Nothing Here',
          message: 'There\'s nothing to display at the moment.',
          actionLabel: 'Go Back',
          actionIcon: Icons.arrow_back,
        );
    }
  }
}

class _EmptyStateConfig {
  final IconData icon;
  final Color color;
  final String title;
  final String message;
  final String actionLabel;
  final IconData actionIcon;

  _EmptyStateConfig({
    required this.icon,
    required this.color,
    required this.title,
    required this.message,
    required this.actionLabel,
    required this.actionIcon,
  });
}
