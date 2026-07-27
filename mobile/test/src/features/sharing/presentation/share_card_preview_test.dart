import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:soundcheck_flutter/src/features/sharing/data/share_repository.dart';
import 'package:soundcheck_flutter/src/features/sharing/presentation/share_card_preview.dart';

void main() {
  Widget buildPreview(AsyncValue<ShareCardUrls> cardUrls) {
    return MaterialApp(
      home: Scaffold(
        body: ShareCardPreview(
          cardUrls: cardUrls,
          shareText: 'I checked in',
          shareUrl: 'https://soundcheck.example/share/c/checkin-1',
        ),
      ),
    );
  }

  GestureDetector button(WidgetTester tester, String label) {
    return tester.widget<GestureDetector>(
      find.ancestor(
        of: find.text(label),
        matching: find.byType(GestureDetector),
      ),
    );
  }

  testWidgets('loading state disables image-dependent share targets', (
    tester,
  ) async {
    await tester.pumpWidget(buildPreview(const AsyncLoading()));

    expect(find.text('Share your check-in'), findsOneWidget);
    expect(find.text('Stories'), findsOneWidget);
    expect(find.text('TikTok'), findsOneWidget);
    expect(find.text('Share'), findsOneWidget);
    expect(button(tester, 'Stories').onTap, isNull);
    expect(button(tester, 'TikTok').onTap, isNull);
    expect(button(tester, 'Share').onTap, isNotNull);
  });

  testWidgets('generation errors show fallback UI without dead generic share', (
    tester,
  ) async {
    await tester.pumpWidget(
      buildPreview(AsyncError(StateError('renderer down'), StackTrace.empty)),
    );

    expect(find.text('Card preview unavailable'), findsOneWidget);
    expect(find.byIcon(Icons.image_not_supported_outlined), findsOneWidget);
    expect(button(tester, 'Stories').onTap, isNull);
    expect(button(tester, 'TikTok').onTap, isNull);
    expect(button(tester, 'Share').onTap, isNotNull);
  });
}
