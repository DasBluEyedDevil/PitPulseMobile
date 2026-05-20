import 'package:flutter_test/flutter_test.dart';
import 'package:purchases_flutter/purchases_flutter.dart';
import 'package:soundcheck_flutter/src/features/subscription/presentation/subscription_service.dart';

void main() {
  group('SubscriptionService.hasUnlimitedEntitlement', () {
    test('accepts the SoundCheck Unlimited entitlement identifier', () {
      final customerInfo = _customerInfoWithActiveEntitlement(
        SubscriptionService.entitlementIdentifier,
      );

      expect(SubscriptionService.hasUnlimitedEntitlement(customerInfo), isTrue);
    });

    test('accepts legacy pro entitlement during migration', () {
      final customerInfo = _customerInfoWithActiveEntitlement(
        SubscriptionService.legacyEntitlementIdentifier,
      );

      expect(SubscriptionService.hasUnlimitedEntitlement(customerInfo), isTrue);
    });

    test('rejects inactive or unrelated entitlements', () {
      final customerInfo = _customerInfoWithInactiveEntitlement(
        SubscriptionService.entitlementIdentifier,
      );

      expect(
        SubscriptionService.hasUnlimitedEntitlement(customerInfo),
        isFalse,
      );
    });
  });
}

CustomerInfo _customerInfoWithActiveEntitlement(String identifier) {
  final entitlement = _entitlement(identifier, isActive: true);
  return _customerInfo(
    all: {identifier: entitlement},
    active: {identifier: entitlement},
  );
}

CustomerInfo _customerInfoWithInactiveEntitlement(String identifier) {
  return _customerInfo(
    all: {identifier: _entitlement(identifier, isActive: false)},
    active: const {},
  );
}

CustomerInfo _customerInfo({
  required Map<String, EntitlementInfo> all,
  required Map<String, EntitlementInfo> active,
}) {
  return CustomerInfo(
    EntitlementInfos(all, active),
    const {},
    const [],
    const [],
    const [],
    '2026-05-19T00:00:00Z',
    'test-user',
    const {},
    '2026-05-19T00:00:00Z',
  );
}

EntitlementInfo _entitlement(String identifier, {required bool isActive}) {
  return EntitlementInfo(
    identifier,
    isActive,
    true,
    '2026-05-19T00:00:00Z',
    '2026-05-19T00:00:00Z',
    SubscriptionService.productMonthly,
    true,
  );
}
