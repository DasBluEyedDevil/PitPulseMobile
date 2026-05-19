import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../features/notifications/presentation/providers/notification_providers.dart';
import 'brand_widgets.dart';

/// A scaffold with a custom bottom navigation bar featuring:
/// - 5 tabs: Feed, Discover, [Check-In Button], Profile, Notifications
/// - A floating Check-In button that breaks the nav bar boundary
class ScaffoldWithNavBar extends StatelessWidget {
  const ScaffoldWithNavBar({required this.navigationShell, super.key});

  final StatefulNavigationShell navigationShell;

  void _onTap(BuildContext context, int index) {
    // Index 2 is the check-in button (center), handled separately
    if (index == 2) {
      // Navigate to check-in screen
      context.push('/checkin');
      return;
    }

    // Adjust index for branches since check-in is not a branch
    final branchIndex = index > 2 ? index - 1 : index;

    navigationShell.goBranch(
      branchIndex,
      initialLocation: branchIndex == navigationShell.currentIndex,
    );
  }

  int _getSelectedIndex() {
    // Map branch index to nav bar index (accounting for check-in button)
    final currentIndex = navigationShell.currentIndex;
    return currentIndex >= 2 ? currentIndex + 1 : currentIndex;
  }

  @override
  Widget build(BuildContext context) {
    final selectedIndex = _getSelectedIndex();

    return Scaffold(
      body: navigationShell,
      extendBody: true,
      bottomNavigationBar: _CustomBottomNavBar(
        selectedIndex: selectedIndex,
        onTap: (index) => _onTap(context, index),
      ),
    );
  }
}

class _CustomBottomNavBar extends StatelessWidget {
  const _CustomBottomNavBar({required this.selectedIndex, required this.onTap});

  final int selectedIndex;
  final void Function(int) onTap;

  @override
  Widget build(BuildContext context) {
    return Consumer(
      builder: (context, ref, _) {
        final unreadCount = ref.watch(unreadNotificationCountProvider);
        return FlashBottomNav(
          selectedIndex: selectedIndex,
          onTap: onTap,
          activityBadgeCount: unreadCount.asData?.value ?? 0,
        );
      },
    );
  }
}
