import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:soundcheck_flutter/src/features/badges/domain/badge.dart'
    as badge_model;
import 'package:soundcheck_flutter/src/features/badges/presentation/badge_providers.dart';
import 'package:soundcheck_flutter/src/features/checkins/domain/checkin.dart';
import 'package:soundcheck_flutter/src/features/sharing/presentation/celebration_screen.dart';
import 'package:soundcheck_flutter/src/features/sharing/presentation/share_providers.dart';

void main() {
  testWidgets(
    'renders check-in context, earned badges, progress, and share fallback',
    (tester) async {
      const params = CelebrationParams(
        checkinId: 'checkin-1',
        bandName: 'The Testers',
        venueName: 'Contract Hall',
        earnedBadges: [
          EarnedBadge(
            id: 'earned-1',
            name: 'First Check-In',
            description: 'Checked in for the first time',
            color: '#FF0000',
          ),
          EarnedBadge(
            id: 'earned-2',
            name: 'Venue Explorer',
            color: 'invalid-color',
          ),
        ],
      );
      final progress = [
        badge_model.BadgeProgress(
          badge: _badge('near', 'Almost There'),
          currentValue: 3,
          requirementValue: 10,
          isEarned: false,
        ),
        badge_model.BadgeProgress(
          badge: _badge('low', 'Just Started'),
          currentValue: 2,
          requirementValue: 10,
          isEarned: false,
        ),
        badge_model.BadgeProgress(
          badge: _badge('earned', 'Already Earned'),
          currentValue: 10,
          requirementValue: 10,
          isEarned: true,
        ),
        badge_model.BadgeProgress(
          badge: _badge('invalid', 'No Requirement'),
          currentValue: 0,
          requirementValue: 0,
          isEarned: false,
        ),
      ];

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            checkinCardProvider(
              'checkin-1',
            ).overrideWith((ref) async => throw StateError('renderer down')),
            badgeProgressProvider.overrideWith((ref) async => progress),
          ],
          child: const MaterialApp(home: CelebrationScreen(params: params)),
        ),
      );
      await tester.pump(const Duration(seconds: 1));

      expect(find.text('Checked In!'), findsOneWidget);
      expect(find.text('You checked in!'), findsOneWidget);
      expect(find.text('The Testers'), findsOneWidget);
      expect(find.text('Contract Hall'), findsOneWidget);
      expect(find.text('Card preview unavailable'), findsOneWidget);
      expect(find.text('Badges Earned!'), findsOneWidget);
      expect(find.text('First Check-In'), findsOneWidget);
      expect(find.text('Venue Explorer'), findsOneWidget);
      expect(find.text('Badge Progress'), findsOneWidget);
      expect(find.text('Almost There'), findsOneWidget);
      expect(find.text('3/10'), findsOneWidget);
      expect(find.text('Just Started'), findsNothing);
      expect(find.text('Already Earned'), findsNothing);
      expect(find.text('No Requirement'), findsNothing);
      expect(find.text('Done'), findsOneWidget);
    },
  );

  testWidgets('hides optional badge sections while progress is loading', (
    tester,
  ) async {
    const params = CelebrationParams(
      checkinId: 'checkin-2',
      bandName: 'Quiet Band',
      venueName: 'Small Room',
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          checkinCardProvider(
            'checkin-2',
          ).overrideWith((ref) async => throw StateError('renderer down')),
          badgeProgressProvider.overrideWith(
            (ref) => Completer<List<badge_model.BadgeProgress>>().future,
          ),
        ],
        child: const MaterialApp(home: CelebrationScreen(params: params)),
      ),
    );
    await tester.pump();

    expect(find.text('Quiet Band'), findsOneWidget);
    expect(find.text('Small Room'), findsOneWidget);
    expect(find.text('Badges Earned!'), findsNothing);
    expect(find.text('Badge Progress'), findsNothing);
  });
}

badge_model.Badge _badge(String id, String name) => badge_model.Badge(
  id: id,
  name: name,
  createdAt: '2026-07-27T20:00:00Z',
  category: badge_model.BadgeCategory.checkinCount,
);
