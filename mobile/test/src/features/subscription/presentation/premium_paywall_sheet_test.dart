import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:purchases_flutter/purchases_flutter.dart';
import 'package:purchases_ui_flutter/purchases_ui_flutter.dart';
import 'package:soundcheck_flutter/src/core/providers/providers.dart';
import 'package:soundcheck_flutter/src/features/subscription/domain/subscription_state.dart';
import 'package:soundcheck_flutter/src/features/subscription/presentation/subscription_providers.dart';
import 'package:soundcheck_flutter/src/features/subscription/presentation/subscription_service.dart';
import 'package:soundcheck_flutter/src/features/subscription/presentation/widgets/premium_paywall_sheet.dart';

void main() {
  testWidgets(
    'stale paywall result from A cannot promote known-free session B',
    (tester) async {
      final sdk = _DelayedRevenueCatSdk();
      final container = ProviderContainer(
        overrides: [revenueCatSdkAdapterProvider.overrideWithValue(sdk)],
      );
      addTearDown(container.dispose);
      final premiumSubscription = container.listen(
        isPremiumProvider,
        (_, _) {},
        fireImmediately: true,
      );
      addTearDown(premiumSubscription.close);
      final notifier = container.read(isPremiumProvider.notifier);
      notifier.beginSession();

      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: const MaterialApp(home: Scaffold(body: PremiumPaywallSheet())),
        ),
      );
      await tester.tap(find.text('Subscribe'));
      await tester.pump();
      await sdk.paywallEntered.future;

      notifier.beginSession();
      notifier.mergeEvidence(revenueCat: false, server: false);
      expect(container.read(isPremiumProvider), isFalse);

      sdk.paywallResult.complete(PaywallResult.purchased);
      await tester.pumpAndSettle();

      expect(container.read(isPremiumProvider), isFalse);
      expect(find.byType(PremiumPaywallSheet), findsOneWidget);
    },
  );

  testWidgets('modal entry point renders perks and reports paywall errors', (
    tester,
  ) async {
    final sdk = _ImmediateRevenueCatSdk(paywallResult: PaywallResult.error);
    await tester.pumpWidget(
      ProviderScope(
        overrides: [revenueCatSdkAdapterProvider.overrideWithValue(sdk)],
        child: MaterialApp(
          home: Scaffold(
            body: Builder(
              builder: (context) => ElevatedButton(
                onPressed: () => showPremiumPaywallSheet(context),
                child: const Text('Open Unlimited'),
              ),
            ),
          ),
        ),
      ),
    );

    await tester.tap(find.text('Open Unlimited'));
    await tester.pumpAndSettle();

    expect(find.text('Unlock SoundCheck Unlimited'), findsOneWidget);
    expect(find.text('Detailed Wrapped analytics'), findsOneWidget);
    expect(find.text('Year-round analytics'), findsOneWidget);

    await tester.tap(find.text('Subscribe'));
    await tester.pumpAndSettle();

    expect(find.text('Could not open subscription options'), findsOneWidget);
  });

  testWidgets('restore reports when no previous purchase exists', (
    tester,
  ) async {
    final sdk = _ImmediateRevenueCatSdk();
    await _pumpSheet(tester, sdk);

    await tester.tap(find.text('Restore Purchases'));
    await tester.pumpAndSettle();

    expect(find.text('No previous purchases found'), findsOneWidget);
  });

  testWidgets('restore keeps sheet open for an inactive entitlement', (
    tester,
  ) async {
    final sdk = _ImmediateRevenueCatSdk(
      restoredCustomerInfo: _inactiveCustomerInfo(),
    );
    await _pumpSheet(tester, sdk);

    await tester.tap(find.text('Restore Purchases'));
    await tester.pumpAndSettle();

    expect(find.text('No active subscription found'), findsOneWidget);
    expect(find.byType(PremiumPaywallSheet), findsOneWidget);
  });

  testWidgets('restore closes the sheet for an active entitlement', (
    tester,
  ) async {
    final sdk = _ImmediateRevenueCatSdk(
      restoredCustomerInfo: _activeCustomerInfo(),
    );
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          revenueCatSdkAdapterProvider.overrideWithValue(sdk),
          serverSubscriptionStatusProvider.overrideWith(
            (ref) async => const SubscriptionStatus(isPremium: true),
          ),
        ],
        child: MaterialApp(
          home: Scaffold(
            body: Builder(
              builder: (context) => ElevatedButton(
                onPressed: () => showPremiumPaywallSheet(context),
                child: const Text('Open Unlimited'),
              ),
            ),
          ),
        ),
      ),
    );
    await tester.tap(find.text('Open Unlimited'));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Restore Purchases'));
    await tester.pumpAndSettle();

    expect(find.byType(PremiumPaywallSheet), findsNothing);
  });
}

Future<void> _pumpSheet(WidgetTester tester, RevenueCatSdkAdapter sdk) async {
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        revenueCatSdkAdapterProvider.overrideWithValue(sdk),
        serverSubscriptionStatusProvider.overrideWith(
          (ref) async => const SubscriptionStatus(isPremium: false),
        ),
      ],
      child: const MaterialApp(home: Scaffold(body: PremiumPaywallSheet())),
    ),
  );
}

class _DelayedRevenueCatSdk extends RevenueCatSdkAdapter {
  final paywallEntered = Completer<void>();
  final paywallResult = Completer<PaywallResult>();

  @override
  Future<PaywallResult> presentUnlimitedPaywallIfNeeded() {
    paywallEntered.complete();
    return paywallResult.future;
  }

  @override
  Future<CustomerInfo?> getCustomerInfo() async {
    return _activeCustomerInfo();
  }
}

class _ImmediateRevenueCatSdk extends RevenueCatSdkAdapter {
  _ImmediateRevenueCatSdk({
    this.paywallResult = PaywallResult.cancelled,
    this.restoredCustomerInfo,
  });

  final PaywallResult paywallResult;
  final CustomerInfo? restoredCustomerInfo;

  @override
  Future<PaywallResult> presentUnlimitedPaywallIfNeeded() async {
    return paywallResult;
  }

  @override
  Future<CustomerInfo?> restorePurchases() async {
    return restoredCustomerInfo;
  }
}

CustomerInfo _activeCustomerInfo() {
  const identifier = SubscriptionService.entitlementIdentifier;
  const entitlement = EntitlementInfo(
    identifier,
    true,
    true,
    '2026-07-26T00:00:00Z',
    '2026-07-26T00:00:00Z',
    SubscriptionService.productMonthly,
    true,
  );
  return const CustomerInfo(
    EntitlementInfos({identifier: entitlement}, {identifier: entitlement}),
    {},
    [],
    [],
    [],
    '2026-07-26T00:00:00Z',
    'user-a',
    {},
    '2026-07-26T00:00:00Z',
  );
}

CustomerInfo _inactiveCustomerInfo() {
  const identifier = SubscriptionService.entitlementIdentifier;
  const entitlement = EntitlementInfo(
    identifier,
    false,
    true,
    '2026-07-26T00:00:00Z',
    '2026-07-26T00:00:00Z',
    SubscriptionService.productMonthly,
    true,
  );
  return const CustomerInfo(
    EntitlementInfos({identifier: entitlement}, {}),
    {},
    [],
    [],
    [],
    '2026-07-26T00:00:00Z',
    'user-a',
    {},
    '2026-07-26T00:00:00Z',
  );
}
