import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:purchases_flutter/purchases_flutter.dart';
import 'package:purchases_ui_flutter/purchases_ui_flutter.dart';
import 'package:soundcheck_flutter/src/core/providers/providers.dart';
import 'package:soundcheck_flutter/src/features/subscription/domain/subscription_state.dart';
import 'package:soundcheck_flutter/src/features/subscription/presentation/pro_feature_screen.dart';
import 'package:soundcheck_flutter/src/features/subscription/presentation/subscription_providers.dart';
import 'package:soundcheck_flutter/src/features/subscription/presentation/subscription_service.dart';
import 'package:soundcheck_flutter/src/features/subscription/presentation/widgets/pro_badge.dart';

void main() {
  Future<ProviderContainer> pumpScreen(
    WidgetTester tester,
    _SubscriptionClient client, {
    bool premium = false,
    bool serverPremium = false,
    Future<List<Package>> Function()? packages,
    bool settle = true,
  }) async {
    final container = ProviderContainer(
      overrides: [
        subscriptionSessionClientProvider.overrideWithValue(client),
        serverSubscriptionStatusProvider.overrideWith(
          (ref) async => SubscriptionStatus(isPremium: serverPremium),
        ),
        packagesProvider.overrideWith(
          (ref) => packages?.call() ?? Future.value(const <Package>[]),
        ),
      ],
    );
    addTearDown(container.dispose);
    final subscription = container.listen(
      isPremiumProvider,
      (_, _) {},
      fireImmediately: true,
    );
    addTearDown(subscription.close);
    if (premium) {
      container
          .read(isPremiumProvider.notifier)
          .mergeEvidence(revenueCat: true, server: serverPremium);
    }

    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: const MaterialApp(home: ProFeatureScreen()),
      ),
    );
    if (settle) {
      await tester.pumpAndSettle();
    } else {
      await tester.pump();
    }
    return container;
  }

  testWidgets('renders the free plan state and empty catalog guidance', (
    tester,
  ) async {
    await pumpScreen(tester, _SubscriptionClient());

    expect(find.text('SoundCheck Unlimited'), findsNWidgets(2));
    expect(find.text('Unlock the full concert experience.'), findsOneWidget);
    expect(
      find.text(
        'Plans are configured in RevenueCat and will appear here when available.',
      ),
      findsOneWidget,
    );
    expect(find.text('View plans'), findsOneWidget);
    expect(find.text('Restore purchases'), findsOneWidget);
    expect(find.text('Detailed Wrapped analytics'), findsOneWidget);
    expect(find.text('Terms of Service'), findsOneWidget);
    expect(find.text('Privacy Policy'), findsOneWidget);
  });

  testWidgets('reports an unavailable restore without changing entitlement', (
    tester,
  ) async {
    final client = _SubscriptionClient();
    final container = await pumpScreen(tester, client);

    final restore = find.text('Restore purchases');
    await tester.ensureVisible(restore);
    await tester.tap(restore);
    await tester.pumpAndSettle();

    expect(client.restoreCalls, 1);
    expect(container.read(isPremiumProvider), isFalse);
    expect(find.text('No previous purchases found'), findsOneWidget);
  });

  testWidgets('reports an inactive restored purchase', (tester) async {
    final client = _SubscriptionClient(restoreResult: _inactiveCustomerInfo());
    final container = await pumpScreen(tester, client);

    final restore = find.text('Restore purchases');
    await tester.ensureVisible(restore);
    await tester.tap(restore);
    await tester.pumpAndSettle();

    expect(container.read(isPremiumProvider), isFalse);
    expect(find.text('No active subscription found'), findsOneWidget);
  });

  testWidgets('a purchased paywall reconciles entitlement and unlocks UI', (
    tester,
  ) async {
    final client = _SubscriptionClient(
      paywallResult: PaywallResult.purchased,
      customerInfo: _activeCustomerInfo(),
    );
    final container = await pumpScreen(tester, client, serverPremium: true);

    final viewPlans = find.text('View plans');
    await tester.ensureVisible(viewPlans);
    await tester.tap(viewPlans);
    await tester.pumpAndSettle();

    expect(client.paywallCalls, 1);
    expect(client.customerInfoCalls, 1);
    expect(container.read(isPremiumProvider), isTrue);
    expect(find.text('SoundCheck Unlimited unlocked'), findsOneWidget);
    expect(find.text("You're an Unlimited member."), findsOneWidget);
    expect(find.text('Manage subscription'), findsOneWidget);
  });

  testWidgets('a cancelled paywall leaves the free session unchanged', (
    tester,
  ) async {
    final client = _SubscriptionClient(paywallResult: PaywallResult.cancelled);
    final container = await pumpScreen(tester, client);

    final viewPlans = find.text('View plans');
    await tester.ensureVisible(viewPlans);
    await tester.tap(viewPlans);
    await tester.pumpAndSettle();

    expect(container.read(isPremiumProvider), isFalse);
    expect(client.customerInfoCalls, 0);
    expect(find.text('View plans'), findsOneWidget);
  });

  testWidgets('a paywall SDK error is observable and retryable', (
    tester,
  ) async {
    final client = _SubscriptionClient(paywallResult: PaywallResult.error);
    await pumpScreen(tester, client);

    final viewPlans = find.text('View plans');
    await tester.ensureVisible(viewPlans);
    await tester.tap(viewPlans);
    await tester.pumpAndSettle();

    expect(find.text('Could not open subscription options'), findsOneWidget);
    expect(find.text('View plans'), findsOneWidget);
  });

  testWidgets('premium members can refresh through Customer Center', (
    tester,
  ) async {
    final client = _SubscriptionClient(
      customerInfo: _activeCustomerInfo(),
      customerCenterRestores: _activeCustomerInfo(),
    );
    final container = await pumpScreen(
      tester,
      client,
      premium: true,
      serverPremium: true,
    );

    final manage = find.text('Manage subscription');
    await tester.ensureVisible(manage);
    await tester.tap(manage);
    await tester.pumpAndSettle();

    expect(client.customerCenterCalls, 1);
    expect(client.customerInfoCalls, 1);
    expect(container.read(isPremiumProvider), isTrue);
    expect(find.text('Purchases restored'), findsOneWidget);
  });

  testWidgets('Customer Center failure restores the management control', (
    tester,
  ) async {
    final client = _SubscriptionClient(
      customerCenterFailure: StateError('offline'),
    );
    await pumpScreen(tester, client, premium: true, serverPremium: true);

    final manage = find.text('Manage subscription');
    await tester.ensureVisible(manage);
    await tester.tap(manage);
    await tester.pumpAndSettle();

    expect(find.text('Could not open Customer Center'), findsOneWidget);
    expect(find.text('Manage subscription'), findsOneWidget);
  });

  testWidgets('renders a package-catalog error state', (tester) async {
    await pumpScreen(
      tester,
      _SubscriptionClient(),
      packages: () async => throw StateError('catalog offline'),
    );
    expect(find.textContaining('Could not load plans:'), findsOneWidget);
  });

  testWidgets('ProBadge renders the compact premium marker', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(home: Scaffold(body: ProBadge())),
    );

    expect(find.text('PRO'), findsOneWidget);
    expect(find.byType(ProBadge), findsOneWidget);
  });
}

class _SubscriptionClient implements SubscriptionSessionClient {
  _SubscriptionClient({
    this.paywallResult = PaywallResult.notPresented,
    this.customerInfo,
    this.restoreResult,
    this.customerCenterRestores,
    this.customerCenterFailure,
  });

  final PaywallResult paywallResult;
  final CustomerInfo? customerInfo;
  final CustomerInfo? restoreResult;
  final CustomerInfo? customerCenterRestores;
  final Object? customerCenterFailure;
  int paywallCalls = 0;
  int customerInfoCalls = 0;
  int restoreCalls = 0;
  int customerCenterCalls = 0;

  @override
  Future<CustomerInfo?> getCustomerInfo() async {
    customerInfoCalls++;
    return customerInfo;
  }

  @override
  Future<List<Package>> getPackages() async => const [];

  @override
  Future<bool> login(String userId) async => true;

  @override
  Future<PaywallResult> presentUnlimitedPaywallIfNeeded() async {
    paywallCalls++;
    return paywallResult;
  }

  @override
  Future<void> presentCustomerCenter({
    void Function(CustomerInfo customerInfo)? onRestoreCompleted,
    void Function(PurchasesError error)? onRestoreFailed,
    void Function(
      CustomerInfo customerInfo,
      StoreTransaction transaction,
      String offerIdentifier,
    )?
    onPromotionalOfferSucceeded,
  }) async {
    customerCenterCalls++;
    if (customerCenterFailure case final failure?) throw failure;
    if (customerCenterRestores case final info?) {
      onRestoreCompleted?.call(info);
    }
  }

  @override
  Future<CustomerInfo?> purchase(Package package) async => customerInfo;

  @override
  Future<CustomerInfo?> restorePurchases() async {
    restoreCalls++;
    return restoreResult;
  }

  @override
  Future<void> logout() async {}

  @override
  void setCustomerInfoUpdateListener(CustomerInfoUpdateListener? listener) {}
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
