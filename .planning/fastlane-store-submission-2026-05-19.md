# Fastlane Store Submission Setup - 2026-05-19

## Scope

Add repeatable Fastlane automation for SoundCheck mobile beta submission:

- Android Google Play internal/beta upload from the Flutter AAB.
- Android screenshot capture/sync for Play listing metadata.
- iOS TestFlight upload from the Flutter IPA.
- iOS App Store metadata and screenshot sync/capture hooks.
- Repository-level commands and checks that make the workflow discoverable.

## Files And Subsystems

- `mobile/android/fastlane/`: Android Fastlane lanes, Play metadata, screengrab config.
- `mobile/ios/fastlane/`: iOS Fastlane lanes, App Store metadata, snapshot/deliver config.
- `mobile/android/app/build.gradle.kts`: Android instrumentation dependencies required by screengrab.
- `mobile/android/app/src/androidTest/`: baseline screenshot test for screengrab.
- `scripts/check-fastlane-store-assets.mjs`: local validation of tracked metadata and screenshot source folders.
- `docs/STORE_SUBMISSION_FASTLANE.md`: durable runbook for local beta submission.

## Acceptance Criteria

- Root scripts exist for Android screenshots, Android beta upload, iOS screenshots, iOS beta upload, and Fastlane metadata checks.
- Store listing metadata is tracked as plain text and passes basic length checks.
- Secrets remain outside source control; `.env.example` files document required environment variables.
- Android screengrab has the required debug permissions, test dependency, and a baseline instrumented screenshot test.
- Documentation explains Windows/macOS limitations, including that iOS build/snapshot lanes require macOS and Xcode.

## Verification Plan

- `npm run fastlane:check`
- `npm run harness:check`
- `cd mobile && flutter analyze`
- `cd mobile/android && ./gradlew.bat :app:assembleDebug :app:assembleAndroidTest`

Ruby/Fastlane command verification depends on Ruby/Bundler/Fastlane being installed locally. iOS build verification depends on macOS/Xcode.

## Credential Follow-Through

Completed on 2026-05-19:

- App Store Connect API key `.p8` auth is wired through `APP_STORE_CONNECT_API_KEY_ID`, `APP_STORE_CONNECT_API_ISSUER_ID`, and `APP_STORE_CONNECT_API_KEY_PATH`.
- The local iOS Fastlane `.env` points to ignored key file `mobile/ios/fastlane/AuthKey_JS933PRV8D.p8`.
- The local Android Fastlane `.env` points to ignored service-account JSON `mobile/android/fastlane/play-store-service-account-revenuecat-soundcheck.json`.
- Google Play service account `revenuecat-soundcheck@soundcheck-prod-e973c.iam.gserviceaccount.com` is active for SoundCheck and has the RevenueCat-required app permissions, including manage orders and subscriptions.
- Google Play Android Developer API, Google Play Developer Reporting API, and Pub/Sub API are enabled in the SoundCheck Google Cloud project.

Remaining platform-side caveat:

- RevenueCat still reports credential attention for the newly configured store apps. Treat this as pending provider validation unless it persists past the documented Google propagation window or after the first real test purchase.
