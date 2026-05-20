import 'dart:io' show Platform;

import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:purchases_flutter/purchases_flutter.dart';
import 'package:purchases_ui_flutter/purchases_ui_flutter.dart';

import '../../../core/services/log_service.dart';

class SubscriptionService {
  static const entitlementDisplayName = 'SoundCheck Unlimited';
  static const entitlementIdentifier = 'soundcheck_unlimited';
  static const legacyEntitlementIdentifier = 'pro';
  static const productLifetime = 'lifetime';
  static const productYearly = 'yearly';
  static const productMonthly = 'monthly';

  static const _testStoreApiKey = String.fromEnvironment('RC_TEST_KEY');
  static const _appleApiKey = String.fromEnvironment('RC_APPLE_KEY');
  static const _googleApiKey = String.fromEnvironment('RC_GOOGLE_KEY');
  static CustomerInfoUpdateListener? _customerInfoUpdateListener;
  static bool _configured = false;

  static List<String> get entitlementIdentifiers => const [
    entitlementIdentifier,
    legacyEntitlementIdentifier,
  ];

  static bool get isConfigured => _configured;

  static bool get _isSupportedPlatform => Platform.isIOS || Platform.isAndroid;

  static String get _platformName {
    if (Platform.isIOS) return 'ios';
    if (Platform.isAndroid) return 'android';
    return Platform.operatingSystem;
  }

  static String? get _apiKey {
    final testKey = _testStoreApiKey.trim();
    if (!kReleaseMode && testKey.isNotEmpty) return testKey;

    final platformKey = Platform.isIOS ? _appleApiKey : _googleApiKey;
    final trimmed = platformKey.trim();
    return trimmed.isEmpty ? null : trimmed;
  }

  static Future<bool> initialize({
    CustomerInfoUpdateListener? onCustomerInfoUpdated,
  }) async {
    if (!_isSupportedPlatform) return false;

    if (_configured || await Purchases.isConfigured) {
      _configured = true;
      setCustomerInfoUpdateListener(onCustomerInfoUpdated);
      return true;
    }

    final apiKey = _apiKey;
    if (apiKey == null) {
      if (kReleaseMode) {
        throw StateError(
          'RevenueCat API key missing for $_platformName release build',
        );
      }
      LogService.w(
        'SubscriptionService: No RevenueCat API key -- subscriptions disabled',
      );
      return false;
    }

    await Purchases.setLogLevel(kDebugMode ? LogLevel.debug : LogLevel.error);
    await Purchases.configure(PurchasesConfiguration(apiKey));
    _configured = true;
    setCustomerInfoUpdateListener(onCustomerInfoUpdated);
    return true;
  }

  static void setCustomerInfoUpdateListener(
    CustomerInfoUpdateListener? listener,
  ) {
    final previous = _customerInfoUpdateListener;
    if (previous != null) {
      Purchases.removeCustomerInfoUpdateListener(previous);
    }

    _customerInfoUpdateListener = listener;
    if (listener != null && _configured) {
      Purchases.addCustomerInfoUpdateListener(listener);
    }
  }

  static bool hasUnlimitedEntitlement(CustomerInfo customerInfo) {
    return entitlementIdentifiers.any((identifier) {
      return customerInfo.entitlements.active.containsKey(identifier) ||
          (customerInfo.entitlements.all[identifier]?.isActive ?? false);
    });
  }

  static Future<CustomerInfo?> getCustomerInfo() async {
    try {
      if (!await initialize()) return null;
      return await Purchases.getCustomerInfo();
    } on PlatformException catch (e, stack) {
      LogService.e('SubscriptionService.getCustomerInfo error: $e', e, stack);
      return null;
    }
  }

  static Future<void> login(String userId) async {
    try {
      if (!await initialize()) return;
      await Purchases.logIn(userId);
    } on PlatformException catch (e) {
      LogService.e('SubscriptionService.login error: $e');
    }
  }

  static Future<void> logout() async {
    try {
      if (!await initialize()) return;
      await Purchases.logOut();
    } on PlatformException catch (e) {
      final errorCode = PurchasesErrorHelper.getErrorCode(e);
      if (errorCode != PurchasesErrorCode.logOutWithAnonymousUserError) {
        LogService.e('SubscriptionService.logout error: $e');
      }
    }
  }

  static Future<bool> isPremium() async {
    final customerInfo = await getCustomerInfo();
    return customerInfo != null && hasUnlimitedEntitlement(customerInfo);
  }

  static Future<List<Package>> getPackages() async {
    try {
      if (!await initialize()) return [];
      final offerings = await Purchases.getOfferings();
      return _sortSoundCheckPackages(
        offerings.current?.availablePackages ?? [],
      );
    } on PlatformException catch (e) {
      LogService.e('SubscriptionService.getPackages error: $e');
      return [];
    }
  }

  /// Purchase a package. Returns CustomerInfo on success, null on user
  /// cancellation. Rethrows PlatformException for actual errors.
  static Future<CustomerInfo?> purchase(Package package) async {
    try {
      if (!await initialize()) return null;
      final result = await Purchases.purchase(PurchaseParams.package(package));
      return result.customerInfo;
    } on PlatformException catch (e) {
      final errorCode = PurchasesErrorHelper.getErrorCode(e);
      if (errorCode == PurchasesErrorCode.purchaseCancelledError) {
        return null; // User cancelled -- not an error
      }
      rethrow; // Actual error -- let caller handle
    }
  }

  /// Restore purchases. Returns CustomerInfo on success, null on error.
  static Future<CustomerInfo?> restorePurchases() async {
    try {
      if (!await initialize()) return null;
      return await Purchases.restorePurchases();
    } on PlatformException catch (e) {
      final errorCode = PurchasesErrorHelper.getErrorCode(e);
      LogService.e('SubscriptionService.restorePurchases error: $errorCode');
      return null;
    }
  }

  static Future<PaywallResult> presentUnlimitedPaywallIfNeeded() async {
    try {
      final customerInfo = await getCustomerInfo();
      if (customerInfo != null && hasUnlimitedEntitlement(customerInfo)) {
        return PaywallResult.notPresented;
      }
      if (!await initialize()) return PaywallResult.error;

      return RevenueCatUI.presentPaywallIfNeeded(
        entitlementIdentifier,
        displayCloseButton: true,
      );
    } on PlatformException catch (e, stack) {
      LogService.e('SubscriptionService.presentPaywall error: $e', e, stack);
      return PaywallResult.error;
    }
  }

  static Future<void> presentCustomerCenter({
    void Function(CustomerInfo customerInfo)? onRestoreCompleted,
    void Function(PurchasesError error)? onRestoreFailed,
    void Function(
      CustomerInfo customerInfo,
      StoreTransaction transaction,
      String offerIdentifier,
    )?
    onPromotionalOfferSucceeded,
  }) async {
    if (!await initialize()) return;
    await RevenueCatUI.presentCustomerCenter(
      onRestoreCompleted: onRestoreCompleted,
      onRestoreFailed: onRestoreFailed,
      onPromotionalOfferSucceeded: onPromotionalOfferSucceeded,
    );
  }

  static List<Package> _sortSoundCheckPackages(List<Package> packages) {
    final sorted = [...packages];
    sorted.sort((a, b) {
      final rankComparison = _packageRank(a).compareTo(_packageRank(b));
      if (rankComparison != 0) return rankComparison;
      return a.identifier.compareTo(b.identifier);
    });
    return sorted;
  }

  static int _packageRank(Package package) {
    final productId = package.storeProduct.identifier;
    if (package.packageType == PackageType.lifetime ||
        productId == productLifetime) {
      return 0;
    }
    if (package.packageType == PackageType.annual ||
        productId == productYearly) {
      return 1;
    }
    if (package.packageType == PackageType.monthly ||
        productId == productMonthly) {
      return 2;
    }
    return 3;
  }
}
