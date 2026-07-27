# Fastlane Store Submission Runbook

SoundCheck uses platform-local Fastlane projects under `mobile/android` and `mobile/ios`, matching Flutter and Fastlane's recommended layout for Flutter apps. The root `package.json` exposes common commands so the workflow can still be run from the monorepo root.

## Prerequisites

- Ruby and Bundler.
- Flutter on `PATH`.
- Android SDK for Android lanes.
- macOS, Xcode, and `FLUTTER_ROOT` for iOS build and screenshot lanes.
- Android release signing from `mobile/KEYSTORE_SETUP.md`.
- Google Play service account JSON for upload lanes.
- App Store Connect API key `.p8` credentials, API key JSON, or Apple ID credentials for TestFlight lanes.

Fastlane is only partially useful on Windows because iOS builds and snapshots require Xcode. Android metadata checks and Android build lanes can still be prepared from Windows.

The root npm scripts call `scripts/run-fastlane.mjs`, which clears conflicting RubyGems environment variables and runs Fastlane through the selected Ruby executable. Set `SOUNDCHECK_RUBY_EXE` or `SOUNDCHECK_RUBY_BIN` if Ruby is installed somewhere other than a common RubyInstaller/Scoop path.

## First-Time Setup

Install Fastlane dependencies for each platform:

```bash
cd mobile/android
bundle install

cd ../ios
bundle install
```

Copy the platform `.env.example` files to `.env` and fill in local credentials. Do not commit `.env`, Play service account JSON, App Store Connect API key JSON, `.p8` keys, keystores, or passwords.

If these values currently live only in Android Studio, Xcode, or another IDE run configuration, copy the release values into the platform Fastlane `.env` file. IDE settings are not a reliable source for `npm` or Fastlane processes launched from a terminal.

For Firebase values, copy `mobile/.env.firebase.example` to `mobile/.env.firebase` and fill in the SoundCheck Firebase keys. Flutter supports `--dart-define-from-file` for `.env` and `.json` files; Fastlane validates keys in that file before building. Do not reuse keys from another app/project.

For RevenueCat values, copy `mobile/.env.revenuecat.example` to `mobile/.env.revenuecat`. Debug/profile builds may use `RC_TEST_KEY`, but store-submission builds must use the platform-specific `RC_GOOGLE_KEY` and `RC_APPLE_KEY`.

Android `mobile/android/fastlane/.env` typically needs:

```bash
SUPPLY_JSON_KEY_FILE=fastlane/play-store-service-account-revenuecat-soundcheck.json
SUPPLY_TRACK=internal
SOUNDCHECK_FLUTTER_BUILD_ARGS=--dart-define-from-file=.env.firebase --dart-define-from-file=.env.revenuecat --dart-define=SENTRY_DSN=...
```

iOS `mobile/ios/fastlane/.env` typically needs:

```bash
APP_STORE_CONNECT_API_KEY_ID=REPLACE_ME
APP_STORE_CONNECT_API_ISSUER_ID=REPLACE_ME
APP_STORE_CONNECT_API_KEY_PATH=fastlane/AuthKey_REPLACE_ME.p8
SOUNDCHECK_FLUTTER_BUILD_ARGS=--dart-define-from-file=.env.firebase --dart-define-from-file=.env.revenuecat --dart-define=SENTRY_DSN=...
```

For external TestFlight beta review, also set the `BETA_REVIEW_*` variables shown in `mobile/ios/fastlane/.env.example`.

SoundCheck's Flutter code currently reads these release keys:

- Firebase: `FIREBASE_ANDROID_API_KEY`, `FIREBASE_IOS_API_KEY`
- RevenueCat: `RC_GOOGLE_KEY`, `RC_APPLE_KEY`
- Optional crash reporting: `SENTRY_DSN`

RevenueCat public SDK keys should come from a SoundCheck RevenueCat project under Project settings > API keys > App specific keys. A shared or unrelated project key will initialize the SDK but route purchases and entitlements to the wrong RevenueCat project.

RevenueCat beta-readiness checklist:

- Use a SoundCheck RevenueCat project, not another app's project.
- Add real app configurations for Android package `com.soundcheck.app` and iOS bundle ID `com.9thlevelsoftware.soundcheck`.
- Copy the app-specific public SDK keys into `RC_GOOGLE_KEY` and `RC_APPLE_KEY`.
- Keep or create the `soundcheck_unlimited` entitlement; `SubscriptionService` only keeps `pro` as a legacy fallback.
- Connect matching Play Store and App Store products before testing real store purchases in beta.

Current local credential state, configured May 19, 2026:

- `mobile/.env.revenuecat` contains the SoundCheck Test Store, App Store, and Play Store public SDK keys and is ignored by git.
- `mobile/android/fastlane/.env` points `SUPPLY_JSON_KEY_FILE` at `fastlane/play-store-service-account-revenuecat-soundcheck.json`, which is ignored by git.
- `mobile/ios/fastlane/.env` points `APP_STORE_CONNECT_API_KEY_PATH` at `fastlane/AuthKey_JS933PRV8D.p8`, which is ignored by git.
- App Store Connect in-app purchase key `SubscriptionKey_68JL28Q3QS.p8` is stored under `mobile/ios/fastlane/` for RevenueCat service credentials and is ignored by git.
- Google Play Android Developer API, Google Play Developer Reporting API, and Pub/Sub API are enabled for the SoundCheck Google Cloud project.

RevenueCat still may show "Credentials need attention" until Apple/Google propagation completes. RevenueCat's Google Play credential guide says Google credentials can take up to 36 hours to validate after service-account and permission changes.

The tracked release identity is `com.soundcheck.app` on Android and
`com.9thlevelsoftware.soundcheck` on iOS. A successful local configuration
check does not prove that RevenueCat, App Store Connect, or Google Play has the
matching app or valid credentials; confirm those external records and a sandbox
purchase before promotion.

## Metadata And Screenshots

Tracked listing text lives in:

- Android Play metadata: `mobile/android/fastlane/metadata/android/en-US/`
- iOS App Store metadata: `mobile/ios/fastlane/metadata/default/`

Curated screenshots live in:

- Android source screenshots: `mobile/store-assets/screenshots/android/curated/`
- iOS source screenshots: `mobile/store-assets/screenshots/ios/curated/`

Run the metadata/screenshot sanity check:

```bash
npm run fastlane:check
```

The Android `screenshots` lane copies curated screenshots into the Play metadata folder before upload. The Android `capture_store_screenshots` lane builds the debug and AndroidTest APKs, then runs screengrab against the baseline screenshot test.

The iOS `screenshots` lane copies curated screenshots into `mobile/ios/fastlane/screenshots/en-US/`. The iOS `capture_store_screenshots` lane runs Fastlane snapshot on macOS; it is ready for a native XCUITest screenshot target when one is added.

## Android Beta

From the repo root:

```bash
npm run fastlane:check
npm run fastlane:android:screenshots
npm run fastlane:android:beta
```

To capture screenshots from an emulator or device instead of using curated files:

```bash
npm run fastlane:android:capture-screenshots
```

The beta lane builds `mobile/build/app/outputs/bundle/release/app-release.aab` with Flutter and uploads it with metadata/screenshots to the Play track in `SUPPLY_TRACK` (`internal` by default).

The Android beta build refuses to run unless `SOUNDCHECK_FLUTTER_BUILD_ARGS` includes `FIREBASE_ANDROID_API_KEY` directly or through `--dart-define-from-file`, plus `RC_GOOGLE_KEY`. Set `SKIP_ANDROID_BUILD=1` only when intentionally uploading a previously verified AAB.

## iOS Beta

Run these on macOS with Xcode installed:

```bash
npm run fastlane:check
npm run fastlane:ios:screenshots
npm run fastlane:ios:beta
```

For automated App Store screenshots after an XCUITest screenshot target exists:

```bash
npm run fastlane:ios:capture-screenshots
```

The beta lane builds `mobile/build/ios/ipa/Runner.ipa` with Flutter and uploads it to TestFlight using the tracked beta metadata.

The iOS beta build refuses to run unless `SOUNDCHECK_FLUTTER_BUILD_ARGS` includes `FIREBASE_IOS_API_KEY` directly or through `--dart-define-from-file`, plus `RC_APPLE_KEY`. Set `SKIP_IOS_BUILD=1` only when intentionally uploading a previously verified IPA.

## Store Upload Notes

- Google Play requires the app to exist in Play Console and usually needs at least one manual first upload before API uploads work.
- Android screenshots in `phoneScreenshots/` replace the current Play listing screenshots and are ordered by filename.
- App Store Connect API key authentication is preferred for iOS because it avoids 2FA prompts.
- Do not use fake contact/demo-account data when setting `SUBMIT_BETA_REVIEW=1`; Apple beta review information should be real and reachable.
