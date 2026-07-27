import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:purchases_flutter/purchases_flutter.dart';
import 'package:purchases_ui_flutter/purchases_ui_flutter.dart';
import 'package:soundcheck_flutter/src/core/providers/providers.dart';
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
