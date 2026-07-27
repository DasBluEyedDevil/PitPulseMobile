import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:purchases_flutter/purchases_flutter.dart';
import 'package:purchases_ui_flutter/purchases_ui_flutter.dart';
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

  group('RevenueCatListenerBinding', () {
    test(
      'initialize without a new listener retains the installed listener',
      () {
        final added = <CustomerInfoUpdateListener>[];
        final removed = <CustomerInfoUpdateListener>[];
        final binding = RevenueCatListenerBinding(
          add: added.add,
          remove: removed.add,
        );
        void listener(CustomerInfo _) {}

        binding.replace(listener, sdkConfigured: true);
        binding.onInitialized(null, sdkConfigured: true);

        expect(binding.current, same(listener));
        expect(added, [same(listener)]);
        expect(removed, isEmpty);
      },
    );

    test('explicit clear removes the installed listener exactly once', () {
      final added = <CustomerInfoUpdateListener>[];
      final removed = <CustomerInfoUpdateListener>[];
      final binding = RevenueCatListenerBinding(
        add: added.add,
        remove: removed.add,
      );
      void listener(CustomerInfo _) {}
      binding.replace(listener, sdkConfigured: true);

      binding.replace(null, sdkConfigured: true);
      binding.replace(null, sdkConfigured: true);

      expect(binding.current, isNull);
      expect(added, [same(listener)]);
      expect(removed, [same(listener)]);
    });

    test('attaches a retained listener after delayed SDK initialization', () {
      final added = <CustomerInfoUpdateListener>[];
      final binding = RevenueCatListenerBinding(add: added.add, remove: (_) {});
      void listener(CustomerInfo _) {}

      binding.replace(listener, sdkConfigured: false);
      expect(added, isEmpty);

      binding.onInitialized(null, sdkConfigured: true);
      binding.onInitialized(null, sdkConfigured: true);

      expect(added, [same(listener)]);
    });

    test('replacing an attached listener removes the previous binding', () {
      final added = <CustomerInfoUpdateListener>[];
      final removed = <CustomerInfoUpdateListener>[];
      final binding = RevenueCatListenerBinding(
        add: added.add,
        remove: removed.add,
      );
      void first(CustomerInfo _) {}
      void second(CustomerInfo _) {}

      binding.replace(first, sdkConfigured: true);
      binding.replace(second, sdkConfigured: true);

      expect(added, [same(first), same(second)]);
      expect(removed, [same(first)]);
      expect(binding.current, same(second));
    });
  });

  group('RevenueCatLogoutOperation', () {
    test('rethrows non-anonymous PlatformException', () async {
      final failure = PlatformException(code: 'network_error');
      final operation = RevenueCatLogoutOperation(
        initialize: () async => true,
        logout: () async => throw failure,
        errorCode: (_) => PurchasesErrorCode.networkError,
      );

      await expectLater(operation.run(), throwsA(same(failure)));
    });

    test('ignores the anonymous-user logout error', () async {
      final operation = RevenueCatLogoutOperation(
        initialize: () async => true,
        logout: () async =>
            throw PlatformException(code: 'anonymous_user_logout'),
        errorCode: (_) => PurchasesErrorCode.logOutWithAnonymousUserError,
      );

      await expectLater(operation.run(), completes);
    });

    test('does not call logout when initialization is unavailable', () async {
      var logoutCalls = 0;
      final operation = RevenueCatLogoutOperation(
        initialize: () async => false,
        logout: () async => logoutCalls++,
        errorCode: (_) => PurchasesErrorCode.unknownError,
      );

      await operation.run();

      expect(logoutCalls, 0);
    });
  });

  group('DefaultSubscriptionSessionClient', () {
    test(
      'delegates session operations and callbacks to its SDK boundary',
      () async {
        final sdk = _RecordingRevenueCatSdk();
        final client = DefaultSubscriptionSessionClient(sdk: sdk);
        void listener(CustomerInfo _) {}
        final restoreCompleted = sdk.restoreCompleted;
        final restoreFailed = sdk.restoreFailed;
        final promotionalOfferSucceeded = sdk.promotionalOfferSucceeded;

        expect(await client.login('mobile-user'), isTrue);
        expect(await client.getCustomerInfo(), same(sdk.customerInfo));
        expect(await client.getPackages(), isEmpty);
        expect(await client.restorePurchases(), same(sdk.customerInfo));
        expect(
          await client.presentUnlimitedPaywallIfNeeded(),
          PaywallResult.notPresented,
        );
        await client.presentCustomerCenter(
          onRestoreCompleted: restoreCompleted,
          onRestoreFailed: restoreFailed,
          onPromotionalOfferSucceeded: promotionalOfferSucceeded,
        );
        client.setCustomerInfoUpdateListener(listener);
        await client.logout();

        expect(sdk.loggedInUserIds, ['mobile-user']);
        expect(sdk.customerInfoRequests, 1);
        expect(sdk.packageRequests, 1);
        expect(sdk.restoreRequests, 1);
        expect(sdk.paywallRequests, 1);
        expect(sdk.customerCenterRequests, 1);
        expect(sdk.receivedRestoreCompleted, same(restoreCompleted));
        expect(sdk.receivedRestoreFailed, same(restoreFailed));
        expect(
          sdk.receivedPromotionalOfferSucceeded,
          same(promotionalOfferSucceeded),
        );
        expect(sdk.listener, same(listener));
        expect(sdk.logoutCalls, 1);
      },
    );
  });

  group('unsupported test-host behavior', () {
    test(
      'static service degrades safely when no mobile SDK is available',
      () async {
        expect(SubscriptionService.entitlementIdentifiers, [
          SubscriptionService.entitlementIdentifier,
          SubscriptionService.legacyEntitlementIdentifier,
        ]);
        expect(await SubscriptionService.initialize(), isFalse);
        expect(await SubscriptionService.getCustomerInfo(), isNull);
        expect(await SubscriptionService.login('mobile-user'), isFalse);
        expect(await SubscriptionService.isPremium(), isFalse);
        expect(await SubscriptionService.getPackages(), isEmpty);
        expect(await SubscriptionService.restorePurchases(), isNull);
        expect(
          await SubscriptionService.presentUnlimitedPaywallIfNeeded(),
          PaywallResult.error,
        );
        await expectLater(
          SubscriptionService.presentCustomerCenter(),
          completes,
        );
        await expectLater(SubscriptionService.logout(), completes);
      },
    );

    test(
      'default SDK adapter preserves safe unsupported-host results',
      () async {
        const sdk = DefaultRevenueCatSdkAdapter();
        void listener(CustomerInfo _) {}

        expect(await sdk.login('mobile-user'), isFalse);
        expect(await sdk.getCustomerInfo(), isNull);
        expect(await sdk.getPackages(), isEmpty);
        expect(await sdk.restorePurchases(), isNull);
        expect(
          await sdk.presentUnlimitedPaywallIfNeeded(),
          PaywallResult.error,
        );
        await expectLater(sdk.presentCustomerCenter(), completes);
        sdk.setCustomerInfoUpdateListener(listener);
        sdk.setCustomerInfoUpdateListener(null);
        await expectLater(sdk.logout(), completes);
      },
    );
  });
}

class _RecordingRevenueCatSdk extends RevenueCatSdkAdapter {
  final customerInfo = _customerInfoWithActiveEntitlement(
    SubscriptionService.entitlementIdentifier,
  );
  final loggedInUserIds = <String>[];
  var customerInfoRequests = 0;
  var packageRequests = 0;
  var restoreRequests = 0;
  var paywallRequests = 0;
  var customerCenterRequests = 0;
  var logoutCalls = 0;
  CustomerInfoUpdateListener? listener;
  void Function(CustomerInfo customerInfo)? receivedRestoreCompleted;
  void Function(PurchasesError error)? receivedRestoreFailed;
  void Function(
    CustomerInfo customerInfo,
    StoreTransaction transaction,
    String offerIdentifier,
  )?
  receivedPromotionalOfferSucceeded;

  void restoreCompleted(CustomerInfo _) {}

  void restoreFailed(PurchasesError _) {}

  void promotionalOfferSucceeded(
    CustomerInfo customerInfo,
    StoreTransaction transaction,
    String offerIdentifier,
  ) {}

  @override
  Future<bool> login(String userId) async {
    loggedInUserIds.add(userId);
    return true;
  }

  @override
  Future<CustomerInfo?> getCustomerInfo() async {
    customerInfoRequests++;
    return customerInfo;
  }

  @override
  Future<List<Package>> getPackages() async {
    packageRequests++;
    return [];
  }

  @override
  Future<CustomerInfo?> restorePurchases() async {
    restoreRequests++;
    return customerInfo;
  }

  @override
  Future<PaywallResult> presentUnlimitedPaywallIfNeeded() async {
    paywallRequests++;
    return PaywallResult.notPresented;
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
    customerCenterRequests++;
    receivedRestoreCompleted = onRestoreCompleted;
    receivedRestoreFailed = onRestoreFailed;
    receivedPromotionalOfferSucceeded = onPromotionalOfferSucceeded;
  }

  @override
  void setCustomerInfoUpdateListener(CustomerInfoUpdateListener? listener) {
    this.listener = listener;
  }

  @override
  Future<void> logout() async {
    logoutCalls++;
  }
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
