# Firebase Setup Guide

This guide walks through setting up Firebase for SoundCheck. Firebase is used for:
- **Analytics**: Track user behavior and app usage
- **Cloud Messaging (FCM)**: Push notifications for toasts, comments, and follows
- **Crashlytics** (future): Crash reporting

## Prerequisites

- Google account with access to [Firebase Console](https://console.firebase.google.com/)
- Flutter SDK installed
- Xcode (for iOS builds)
- Android Studio (for Android builds)

---

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **Add project**
3. Enter project name: `SoundCheck` (or your preferred name)
4. Enable Google Analytics (recommended)
5. Select or create an Analytics account
6. Click **Create project**

---

## Step 2: Add Android App

1. In Firebase Console, click **Add app** > **Android**
2. Enter Android package name: `com.soundcheck.app`
   - Find this in `mobile/android/app/build.gradle.kts` under `applicationId`
3. Enter app nickname: `SoundCheck Android`
4. (Optional) Enter SHA-1 certificate fingerprint for Google Sign-In:
   ```bash
   cd mobile/android
   ./gradlew signingReport
   ```
5. Click **Register app**
6. Download `google-services.json`
7. Place it in `mobile/android/app/google-services.json`

> **Security Note**: `google-services.json` is gitignored and should never be committed. Each developer needs their own copy.

---

## Step 3: Add iOS App

1. In Firebase Console, click **Add app** > **iOS**
2. Enter iOS bundle ID: `com.soundcheck.app`
   - Find this in Xcode: Runner > Signing & Capabilities > Bundle Identifier
3. Enter app nickname: `SoundCheck iOS`
4. Click **Register app**
5. Download `GoogleService-Info.plist`
6. Add to Xcode project:
   - Open `mobile/ios/Runner.xcworkspace` in Xcode
   - Drag `GoogleService-Info.plist` into the Runner folder
   - Check **Copy items if needed** and **Add to target: Runner**

> **Security Note**: `GoogleService-Info.plist` is gitignored and should never be committed.

---

## Step 4: Generate Service Account Key (Backend)

The backend uses Firebase Admin SDK for sending push notifications.

1. In Firebase Console, go to **Project Settings** (gear icon)
2. Navigate to **Service accounts** tab
3. Click **Generate new private key**
4. Download the JSON file
5. Set the environment variable:

### Local Development (.env file)
```bash
# Copy the entire JSON contents as a single line
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"your-project",...}
```

### Production (Railway)
1. Go to your Railway project
2. Navigate to Variables
3. Add `FIREBASE_SERVICE_ACCOUNT_JSON`
4. Paste the entire JSON contents

> **Security Note**: Never commit the service account JSON. It has full admin access to your Firebase project.

---

## Step 5: Enable Cloud Messaging

1. In Firebase Console, go to **Cloud Messaging**
2. For iOS, you need to upload APNs authentication key:
   - Go to [Apple Developer](https://developer.apple.com/account/resources/authkeys/list)
   - Create a new key with **Apple Push Notifications service (APNs)**
   - Download the `.p8` file
   - In Firebase Console > Project Settings > Cloud Messaging
   - Under **Apple app configuration**, click Upload
   - Upload the `.p8` file and enter your Key ID and Team ID

---

## Step 6: Verify Configuration

### Android
```bash
cd mobile
flutter run -d android
```
Check logcat for: `FirebaseApp initialization successful`

### iOS
```bash
cd mobile
flutter run -d ios
```
Check console for: `Firebase configured successfully`

### Backend
```bash
cd backend
npm run dev
```
Check logs for: `[PushNotificationService] Firebase initialized successfully`

If Firebase is not configured, you'll see:
`[PushNotificationService] FIREBASE_SERVICE_ACCOUNT_JSON not set. Push notifications disabled.`

---

## Troubleshooting

### "google-services.json not found" (Android)
- Ensure file is at `mobile/android/app/google-services.json`
- Check package name matches between Firebase and `build.gradle.kts`

### "GoogleService-Info.plist not found" (iOS)
- Open Xcode and verify file is in Runner folder
- Check it's added to Runner target

### "Failed to parse service account JSON" (Backend)
- Ensure JSON is valid (no line breaks, properly escaped)
- Try base64 encoding if special characters cause issues

### Push notifications not received
1. Check device has valid FCM token
2. Verify APNs key is uploaded (iOS)
3. Check backend logs for FCM errors
4. Ensure app has notification permissions

---

## File Locations Summary

| File | Location | Committed |
|------|----------|-----------|
| `google-services.json` | `mobile/android/app/` | No (gitignored) |
| `GoogleService-Info.plist` | `mobile/ios/Runner/` | No (gitignored) |
| Service Account JSON | Environment variable | No |

---

## Related Documentation

- [Firebase Flutter Setup](https://firebase.google.com/docs/flutter/setup)
- [FCM Flutter Integration](https://firebase.google.com/docs/cloud-messaging/flutter/client)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
