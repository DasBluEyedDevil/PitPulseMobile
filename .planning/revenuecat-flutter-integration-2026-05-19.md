# RevenueCat Flutter Integration - 2026-05-19

## Goal

Integrate the current RevenueCat Flutter SDK and UI package into SoundCheck so the app can initialize subscriptions, present a hosted RevenueCat paywall, restore/manage purchases, and check the SoundCheck Unlimited entitlement.

## Scope

- Add `purchases_ui_flutter` with Pub while preserving `purchases_flutter`.
- Configure debug/profile builds with a local Test Store key through `mobile/.env.revenuecat`.
- Keep release/store builds on platform-specific `RC_GOOGLE_KEY` and `RC_APPLE_KEY`.
- Replace direct entitlement checks for legacy `pro` with `soundcheck_unlimited`, while preserving `pro` as a migration fallback.
- Wire hosted RevenueCat Paywalls and Customer Center into the existing Pro screen and paywall sheet.
- Document dashboard product/offering setup for `lifetime`, `yearly`, and `monthly`.

## Verification Plan

- `flutter pub add purchases_flutter purchases_ui_flutter`
- `flutter analyze`
- `flutter test`
- Android debug and AndroidTest assembly
- Focused review of RevenueCat docs for current Flutter Paywall and Customer Center APIs

## RevenueCat Dashboard Status

Verified in the SoundCheck RevenueCat project on 2026-05-19:

- Test Store catalog contains products `lifetime`, `yearly`, and `monthly`.
- Entitlement `soundcheck_unlimited` / `SoundCheck Unlimited` is attached to the three products.
- Offering `default` contains three packages.
- Hosted paywall `SoundCheck Unlimited` is published for the `default` offering.
- Customer Center is available with the default dashboard configuration.
- App Store app configuration exists for bundle ID `com.soundcheck.app`; the App Store Connect in-app purchase key has been uploaded.
- Play Store app configuration exists for package `com.soundcheck.app`; the Google Play service-account JSON has been uploaded.
- App-specific public SDK keys are stored in ignored `mobile/.env.revenuecat`.

Remaining release prerequisites:

- Wait for RevenueCat/Apple/Google credential validation to clear, or re-check after the first test purchase if RevenueCat continues to show the credential attention warning.
- Configure Google Real-Time Developer Notifications after Play credentials validate, then send a Play Console test notification and confirm RevenueCat receives it.
