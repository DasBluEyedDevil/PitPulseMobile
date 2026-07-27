import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:purchases_flutter/purchases_flutter.dart';
import 'package:soundcheck_flutter/src/features/subscription/domain/subscription_state.dart';
import 'package:soundcheck_flutter/src/features/subscription/presentation/subscription_providers.dart';
import 'package:soundcheck_flutter/src/features/subscription/presentation/subscription_service.dart';

void main() {
  group('IsPremium conservative entitlement merge', () {
    test('either authoritative source can confirm premium', () {
      final revenueCatContainer = ProviderContainer();
      addTearDown(revenueCatContainer.dispose);
      final revenueCatSubscription = revenueCatContainer.listen(
        isPremiumProvider,
        (_, _) {},
        fireImmediately: true,
      );
      addTearDown(revenueCatSubscription.close);

      revenueCatContainer
          .read(isPremiumProvider.notifier)
          .mergeEvidence(revenueCat: true);

      expect(revenueCatContainer.read(isPremiumProvider), isTrue);

      final serverContainer = ProviderContainer();
      addTearDown(serverContainer.dispose);
      final serverSubscription = serverContainer.listen(
        isPremiumProvider,
        (_, _) {},
        fireImmediately: true,
      );
      addTearDown(serverSubscription.close);

      serverContainer
          .read(isPremiumProvider.notifier)
          .mergeEvidence(server: true);

      expect(serverContainer.read(isPremiumProvider), isTrue);
    });

    test('free requires both sources to be known false', () {
      final container = ProviderContainer();
      addTearDown(container.dispose);
      final subscription = container.listen(
        isPremiumProvider,
        (_, _) {},
        fireImmediately: true,
      );
      addTearDown(subscription.close);
      final notifier = container.read(isPremiumProvider.notifier);
      notifier.mergeEvidence(server: true);

      notifier.mergeEvidence(revenueCat: false);
      expect(container.read(isPremiumProvider), isTrue);

      notifier.mergeEvidence(server: false);
      expect(container.read(isPremiumProvider), isFalse);
    });

    test('unknown evidence cannot demote known premium', () {
      final container = ProviderContainer();
      addTearDown(container.dispose);
      final subscription = container.listen(
        isPremiumProvider,
        (_, _) {},
        fireImmediately: true,
      );
      addTearDown(subscription.close);
      final notifier = container.read(isPremiumProvider.notifier);
      notifier.mergeEvidence(server: true);

      notifier.mergeEvidence();

      expect(container.read(isPremiumProvider), isTrue);
    });

    test('RevenueCat false cannot demote server-confirmed premium', () {
      final container = ProviderContainer();
      addTearDown(container.dispose);
      final subscription = container.listen(
        isPremiumProvider,
        (_, _) {},
        fireImmediately: true,
      );
      addTearDown(subscription.close);
      final notifier = container.read(isPremiumProvider.notifier);

      notifier.mergeEvidence(server: true);
      notifier.mergeEvidence(revenueCat: false);

      expect(container.read(isPremiumProvider), isTrue);
    });

    test(
      'customer-info reconciliation merges server premium with RevenueCat false',
      () async {
        final container = ProviderContainer(
          overrides: [
            serverSubscriptionStatusProvider.overrideWith(
              (ref) async => const SubscriptionStatus(isPremium: true),
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
        final notifier = container.read(isPremiumProvider.notifier);

        await notifier.reconcileCustomerInfo(
          _inactiveCustomerInfo(),
          generation: notifier.sessionGeneration,
        );

        expect(container.read(isPremiumProvider), isTrue);
      },
    );

    test('customer-info server failure cannot demote known premium', () async {
      final previousDebugPrint = debugPrint;
      debugPrint = (message, {wrapWidth}) {};
      addTearDown(() => debugPrint = previousDebugPrint);
      final container = ProviderContainer(
        overrides: [
          serverSubscriptionStatusProvider.overrideWith(
            (ref) async => throw StateError('server unavailable'),
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
      final notifier = container.read(isPremiumProvider.notifier)
        ..mergeEvidence(server: true);

      await notifier.reconcileCustomerInfo(
        _inactiveCustomerInfo(),
        generation: notifier.sessionGeneration,
      );

      expect(container.read(isPremiumProvider), isTrue);
    });
  });
}

CustomerInfo _inactiveCustomerInfo() {
  const identifier = SubscriptionService.entitlementIdentifier;
  const entitlement = EntitlementInfo(
    identifier,
    false,
    true,
    '2026-05-19T00:00:00Z',
    '2026-05-19T00:00:00Z',
    SubscriptionService.productMonthly,
    true,
  );
  return const CustomerInfo(
    EntitlementInfos({identifier: entitlement}, {}),
    {},
    [],
    [],
    [],
    '2026-05-19T00:00:00Z',
    'test-user',
    {},
    '2026-05-19T00:00:00Z',
  );
}
