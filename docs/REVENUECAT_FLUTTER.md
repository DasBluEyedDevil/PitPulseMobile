# RevenueCat Flutter Integration

SoundCheck uses RevenueCat for SoundCheck Unlimited purchases, entitlement checks, hosted Paywalls, and Customer Center.

## Packages

Install or refresh the packages from `mobile/`:

```bash
flutter pub add purchases_flutter purchases_ui_flutter
flutter pub get
```

Current integration files:

- `mobile/lib/src/features/subscription/presentation/subscription_service.dart`
- `mobile/lib/src/features/subscription/presentation/pro_feature_screen.dart`
- `mobile/lib/src/features/subscription/presentation/widgets/premium_paywall_sheet.dart`
- `mobile/lib/src/features/subscription/presentation/subscription_providers.dart`

## Local Configuration

Copy the examples and fill local values:

```bash
cd mobile
cp .env.firebase.example .env.firebase
cp .env.revenuecat.example .env.revenuecat
```

Debug/profile builds can use the RevenueCat Test Store key:

```bash
flutter run --dart-define-from-file=.env.firebase --dart-define-from-file=.env.revenuecat
```

Do not submit a Play Store or App Store build with `RC_TEST_KEY`. Release builds must use `RC_GOOGLE_KEY` and `RC_APPLE_KEY`, passed directly or through `.env.revenuecat`.

## Entitlement Contract

RevenueCat dashboard:

- Entitlement identifier: `soundcheck_unlimited`
- Entitlement display name: `SoundCheck Unlimited`
- Legacy migration fallback still accepted in app: `pro`

The app checks entitlement status with:

```dart
final customerInfo = await SubscriptionService.getCustomerInfo();
final hasUnlimited = customerInfo != null &&
    SubscriptionService.hasUnlimitedEntitlement(customerInfo);
```

## Product And Offering Setup

Versioned SoundCheck RevenueCat release contract:

- Test Store API key is stored only in ignored local `mobile/.env.revenuecat`.
- Products exist: `lifetime`, `yearly`, and `monthly`.
- Entitlement exists: `soundcheck_unlimited` (`SoundCheck Unlimited`).
- Offering exists: `default`, with three packages.
- Hosted Paywall exists and is published for the `default` offering.
- Customer Center is available in the RevenueCat dashboard with the default configuration.
- App Store app configuration must use bundle ID `com.9thlevelsoftware.soundcheck`.
- Play Store app configuration exists for package name `com.soundcheck.app`.
- App-specific public SDK keys are stored only in ignored local/CI configuration as `RC_APPLE_KEY` and `RC_GOOGLE_KEY`.

The RevenueCat dashboard and live store credentials are external state. Confirm
the App Store bundle ID above in RevenueCat before a release build; this
versioned configuration does not prove dashboard credentials or a purchase.

For App Store and Play Store builds, connect real store products to the RevenueCat packages:

| SoundCheck plan | Product identifier | RevenueCat package |
| --- | --- | --- |
| Lifetime | `lifetime` | Lifetime |
| Yearly | `yearly` | Annual |
| Monthly | `monthly` | Monthly |

Then create or update the current offering:

1. Create an offering, usually `default`.
2. Add the Lifetime, Annual, and Monthly packages.
3. Attach products `lifetime`, `yearly`, and `monthly`.
4. Attach all three products to the `soundcheck_unlimited` entitlement.
5. Create a RevenueCat Paywall for the current offering.

Required real app credential state:

- App Store: the RevenueCat app uses bundle ID `com.9thlevelsoftware.soundcheck` and the matching App Store Connect in-app purchase `.p8` key.
- Play Store: the RevenueCat app is configured with package name `com.soundcheck.app` and the Google Play service account credentials JSON.
- Google Play: the SoundCheck service account is active in Play Console and has app permissions for viewing app info, viewing financial data, managing orders/subscriptions, testing tracks, and store presence.
- Google Cloud: the Android Publisher API, Play Developer Reporting API, and Pub/Sub API are enabled for the SoundCheck project.

RevenueCat may continue to show "Credentials need attention" until Apple or Google finishes propagating new keys and permissions. RevenueCat's Google Play credential guide says Google credential validation can take up to 36 hours after service-account changes. Configure Google Real-Time Developer Notifications after the Play credentials validate, then paste the generated Pub/Sub topic ID into Play Console > Monetize > Monetization setup and send a test notification.

## SDK Initialization

`main.dart` initializes RevenueCat before the app starts:

```dart
await SubscriptionService.initialize();
```

`SubscriptionService.initialize()` chooses keys in this order:

1. Non-release build with `RC_TEST_KEY`: Test Store key.
2. iOS release build: `RC_APPLE_KEY`.
3. Android release build: `RC_GOOGLE_KEY`.

The service refuses to configure a release build without a platform key.

## Paywall

Use the hosted RevenueCat Paywall for SoundCheck Unlimited:

```dart
final result = await SubscriptionService.presentUnlimitedPaywallIfNeeded();
if (result == PaywallResult.purchased || result == PaywallResult.restored) {
  final customerInfo = await SubscriptionService.getCustomerInfo();
  final isUnlocked = customerInfo != null &&
      SubscriptionService.hasUnlimitedEntitlement(customerInfo);
}
```

The Pro screen uses this flow for the main `View plans` button. The old local plan list is now informational; checkout is owned by the RevenueCat Paywall.

## Customer Info And Purchases

Manual purchase helpers remain available for fallback/custom UI:

```dart
final packages = await SubscriptionService.getPackages();
final customerInfo = await SubscriptionService.purchase(packages.first);
```

Restore purchases:

```dart
final customerInfo = await SubscriptionService.restorePurchases();
final hasUnlimited = customerInfo != null &&
    SubscriptionService.hasUnlimitedEntitlement(customerInfo);
```

The authenticated app state registers a RevenueCat customer-info listener after login. When RevenueCat reports updated customer info, the app updates `isPremiumProvider`, invalidates cached customer info, and refreshes server subscription status.

## Customer Center

Customer Center should be available from account/subscription management surfaces after the user has started a purchase or needs restore/support options:

```dart
await SubscriptionService.presentCustomerCenter(
  onRestoreCompleted: (customerInfo) {
    final hasUnlimited =
        SubscriptionService.hasUnlimitedEntitlement(customerInfo);
  },
);
```

The Pro screen shows `Manage subscription` for active Unlimited users. RevenueCat Customer Center must also be configured in the RevenueCat dashboard and may require an eligible RevenueCat plan.

## Native Requirements

Android:

- `android:launchMode="singleTop"` on `MainActivity`.
- `com.android.vending.BILLING` permission.
- `MainActivity` extends `FlutterFragmentActivity` for RevenueCat Paywalls.

iOS:

- Deployment target is already `13.0`, above RevenueCat's minimum.
- Enable the In-App Purchase capability in Xcode before production TestFlight/App Store flows.

## Best Practices

- Configure `Purchases` once, early in app startup.
- Use RevenueCat public SDK keys only; never use secret REST API keys in the app.
- Use the Test Store key only for debug/profile testing.
- Use platform-specific public SDK keys for store builds.
- Treat RevenueCat customer info as the client source of truth for local unlock state.
- Keep the backend subscription endpoint as server-side confirmation for server-gated features.
- Handle purchase cancellation without showing an error.
- Always offer restore purchases and Customer Center management paths.

## References

- RevenueCat Flutter installation: https://www.revenuecat.com/docs/getting-started/installation/flutter
- RevenueCat SDK configuration: https://www.revenuecat.com/docs/getting-started/configuring-sdk
- RevenueCat Paywalls: https://www.revenuecat.com/docs/tools/paywalls
- RevenueCat Customer Center: https://www.revenuecat.com/docs/tools/customer-center
