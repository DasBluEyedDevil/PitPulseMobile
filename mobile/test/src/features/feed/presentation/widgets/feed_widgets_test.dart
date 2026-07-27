import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import 'package:soundcheck_flutter/src/core/providers/providers.dart';
import 'package:soundcheck_flutter/src/features/auth/domain/user.dart';
import 'package:soundcheck_flutter/src/features/feed/domain/feed_item.dart';
import 'package:soundcheck_flutter/src/features/feed/domain/happening_now_group.dart';
import 'package:soundcheck_flutter/src/features/feed/presentation/widgets/feed_card.dart';
import 'package:soundcheck_flutter/src/features/feed/presentation/widgets/happening_now_card.dart';
import 'package:soundcheck_flutter/src/features/feed/presentation/widgets/new_checkins_banner.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('NewCheckinsBanner', () {
    testWidgets('hides at zero, animates count changes, and invokes tap', (
      tester,
    ) async {
      var taps = 0;
      await tester.pumpWidget(
        _material(NewCheckinsBanner(count: 0, onTap: () => taps++)),
      );
      expect(find.textContaining('new check-in'), findsNothing);

      await tester.pumpWidget(
        _material(NewCheckinsBanner(count: 1, onTap: () => taps++)),
      );
      await tester.pump(const Duration(milliseconds: 300));
      expect(find.text('1 new check-in'), findsOneWidget);
      await tester.tap(find.text('1 new check-in'));
      expect(taps, 1);

      await tester.pumpWidget(
        _material(NewCheckinsBanner(count: 3, onTap: () => taps++)),
      );
      await tester.pump();
      expect(find.text('3 new check-ins'), findsOneWidget);

      await tester.pumpWidget(
        _material(NewCheckinsBanner(count: 0, onTap: () => taps++)),
      );
      await tester.pump(const Duration(milliseconds: 300));
      expect(find.textContaining('new check-in'), findsNothing);
    });
  });

  group('HappeningNowCard', () {
    testWidgets('renders one friend, timestamp fallback, semantics, and tap', (
      tester,
    ) async {
      var taps = 0;
      final group = _group(const [
        HappeningNowFriend(userId: 'u1', username: 'Alex'),
      ], lastCheckinAt: 'not-a-date');
      await tester.pumpWidget(
        _material(HappeningNowCard(group: group, onTap: () => taps++)),
      );

      expect(find.text('Summer Fest'), findsOneWidget);
      expect(find.text('The Bowl'), findsOneWidget);
      expect(find.text('Alex at this show'), findsOneWidget);
      expect(find.text('Last check-in: '), findsOneWidget);
      expect(find.text('A'), findsOneWidget);
      expect(find.bySemanticsLabel(RegExp('Alex')), findsAtLeastNWidgets(1));

      await tester.tap(find.byType(HappeningNowCard));
      expect(taps, 1);
    });

    testWidgets('renders two, several, overflow, and empty friend summaries', (
      tester,
    ) async {
      final friends = [
        const HappeningNowFriend(userId: 'u1', username: 'Alex'),
        const HappeningNowFriend(userId: 'u2', username: 'Blair'),
      ];
      await tester.pumpWidget(
        _material(HappeningNowCard(group: _group(friends))),
      );
      expect(find.text('Alex and Blair at this show'), findsOneWidget);

      final three = [
        ...friends,
        const HappeningNowFriend(userId: 'u3', username: 'Casey'),
      ];
      await tester.pumpWidget(
        _material(HappeningNowCard(group: _group(three))),
      );
      expect(find.text('Alex, Blair and Casey at this show'), findsOneWidget);

      await tester.pumpWidget(
        _material(HappeningNowCard(group: _group(three, totalCount: 5))),
      );
      expect(
        find.text('Alex, Blair, Casey and 2 more at this show'),
        findsOneWidget,
      );
      expect(find.text('+2 more'), findsOneWidget);

      await tester.pumpWidget(
        _material(HappeningNowCard(group: _group(const [], totalCount: 0))),
      );
      expect(find.text(''), findsWidgets);
    });
  });

  group('FeedCard', () {
    testWidgets('renders complete own content and invokes toast action', (
      tester,
    ) async {
      var toastTaps = 0;
      final item = _feedItem(
        userId: 'current-user',
        username: 'Jordan',
        createdAt: DateTime.now()
            .subtract(const Duration(minutes: 10))
            .toIso8601String(),
        eventDate: 'Jul 27',
        commentPreview: 'What a set',
        hasBadgeEarned: true,
        hasUserToasted: true,
        toastCount: 4,
        commentCount: 2,
      );
      await tester.pumpWidget(
        _feedApp(
          FeedCard(item: item, onToast: () => toastTaps++),
          currentUser: _currentUser,
        ),
      );
      await tester.pump();

      expect(
        find.byWidgetPredicate(
          (widget) =>
              widget is RichText &&
              widget.text.toPlainText().contains(
                'Jordan checked in at Summer Fest @ The Bowl',
              ),
        ),
        findsOneWidget,
      );
      expect(find.text('Jul 27'), findsOneWidget);
      expect(find.text('What a set'), findsOneWidget);
      expect(find.text('Badge Earned!'), findsOneWidget);
      expect(find.text('10m ago'), findsOneWidget);
      expect(find.byType(PopupMenuButton<String>), findsNothing);

      await tester.tap(find.byIcon(Icons.sports_bar));
      expect(toastTaps, 1);
    });

    testWidgets('handles sparse foreign content and routes card/comment taps', (
      tester,
    ) async {
      final router = GoRouter(
        initialLocation: '/',
        routes: [
          GoRoute(
            path: '/',
            builder: (_, _) => FeedCard(
              item: _feedItem(
                userId: 'another-user',
                username: '',
                createdAt: 'bad-date',
              ),
            ),
          ),
          GoRoute(
            path: '/checkins/:id',
            builder: (_, state) => Text(
              'detail-${state.pathParameters['id']}',
              textDirection: TextDirection.ltr,
            ),
          ),
        ],
      );
      addTearDown(router.dispose);
      await tester.pumpWidget(
        ProviderScope(
          retry: (_, _) => null,
          overrides: [
            authStateProvider.overrideWithBuild((_, _) async => _currentUser),
          ],
          child: MaterialApp.router(routerConfig: router),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('?'), findsOneWidget);
      expect(find.byType(PopupMenuButton<String>), findsOneWidget);
      expect(find.text('Badge Earned!'), findsNothing);
      expect(find.text(''), findsWidgets);

      await tester.tap(find.byIcon(Icons.chat_bubble_outline));
      await tester.pumpAndSettle();
      expect(find.text('detail-checkin-1'), findsOneWidget);
    });
  });
}

Widget _material(Widget child) {
  return MaterialApp(
    home: Scaffold(body: Center(child: child)),
  );
}

Widget _feedApp(Widget child, {required User currentUser}) {
  return ProviderScope(
    retry: (_, _) => null,
    overrides: [
      authStateProvider.overrideWithBuild((_, _) async => currentUser),
    ],
    child: MaterialApp(
      home: Scaffold(body: SingleChildScrollView(child: child)),
    ),
  );
}

HappeningNowGroup _group(
  List<HappeningNowFriend> friends, {
  int? totalCount,
  String? lastCheckinAt,
}) {
  return HappeningNowGroup(
    eventId: 'event-1',
    eventName: 'Summer Fest',
    venueName: 'The Bowl',
    friends: friends,
    totalFriendCount: totalCount ?? friends.length,
    lastCheckinAt:
        lastCheckinAt ??
        DateTime.now().subtract(const Duration(hours: 2)).toIso8601String(),
  );
}

FeedItem _feedItem({
  required String userId,
  required String username,
  required String createdAt,
  String? eventDate,
  String? commentPreview,
  bool hasBadgeEarned = false,
  bool hasUserToasted = false,
  int toastCount = 0,
  int commentCount = 0,
}) {
  return FeedItem(
    id: 'item-1',
    checkinId: 'checkin-1',
    userId: userId,
    username: username,
    eventId: 'event-1',
    eventName: 'Summer Fest',
    venueName: 'The Bowl',
    createdAt: createdAt,
    eventDate: eventDate,
    commentPreview: commentPreview,
    hasBadgeEarned: hasBadgeEarned,
    hasUserToasted: hasUserToasted,
    toastCount: toastCount,
    commentCount: commentCount,
  );
}

const _currentUser = User(
  id: 'current-user',
  email: 'current@example.com',
  username: 'current',
  isVerified: true,
  isActive: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
);
