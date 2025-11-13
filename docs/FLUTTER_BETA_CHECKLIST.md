# 🚀 PitPulse Flutter Beta Release Checklist

**Updated:** November 2025 (Flutter Migration)
**Current Status:** Beta-Ready Configuration Complete ✅

---

## ✅ **COMPLETED** - Critical Blockers Fixed!

### Backend (Node.js/TypeScript + Railway)
- [x] Backend deployed to Railway and live
- [x] Production API URL: `https://pitpulsemobile-production.up.railway.app/api`
- [x] All endpoints implemented (Auth, Venues, Bands, Reviews, Badges)
- [x] JWT authentication configured
- [x] Strong JWT secret generated (128 hex characters)
- [x] .env file created with production values
- [x] CORS configured for mobile apps

### Mobile App (Flutter)
- [x] Flutter migration from React Native completed
- [x] Full feature-driven architecture implemented
- [x] Riverpod state management configured
- [x] GoRouter navigation set up
- [x] API integration with production backend
- [x] Authentication screens (Login, Register)
- [x] All core screens implemented

### Android Configuration
- [x] INTERNET permission added to AndroidManifest.xml
- [x] ACCESS_NETWORK_STATE permission added
- [x] Package name changed from `com.example.pitpulse_flutter` to `com.pitpulse.app`
- [x] Version updated to `0.1.0+1` (beta semver)
- [x] Release signing configuration added to build.gradle.kts
- [x] ProGuard rules created for Flutter/Dart
- [x] Code shrinking and obfuscation enabled
- [x] Keystore setup documentation created (KEYSTORE_SETUP.md)
- [x] .gitignore updated to exclude keystores

### iOS Configuration
- [x] iOS platform initialized
- [x] Info.plist configured with App Transport Security
- [x] HTTPS-only with localhost exception for debug
- [x] Privacy permissions added (Camera, Photos, Location)
- [x] Bundle identifier set to `com.pitpulse.app`
- [x] App display name set to "PitPulse"

---

## 📋 **REMAINING TASKS** - Pre-Beta Launch

### Phase 1: Keystore Generation (30 minutes)

#### Android Release Keystore
```bash
# Generate keystore (from project root)
keytool -genkey -v -keystore mobile/android/app/upload-keystore.jks \
  -keyalg RSA -keysize 2048 -validity 10000 -alias pitpulse

# Create key.properties file
cat > mobile/android/key.properties <<EOF
storePassword=YOUR_KEYSTORE_PASSWORD
keyPassword=YOUR_KEY_PASSWORD
keyAlias=pitpulse
storeFile=upload-keystore.jks
EOF

# Backup keystore immediately!
# Copy to: encrypted drive, password manager, cloud storage
```

**CRITICAL**: Save keystore and passwords securely! Cannot update app without them.

**Reference**: See `mobile/KEYSTORE_SETUP.md` for detailed instructions

### Phase 2: Database Setup (1-2 hours)

#### Option A: Railway PostgreSQL (Recommended)
1. In Railway dashboard, add PostgreSQL database to project
2. Copy `DATABASE_URL` from Railway dashboard
3. Update `backend/.env` with actual `DATABASE_URL`
4. Initialize database schema:
   ```bash
   # Connect to Railway PostgreSQL
   railway login
   railway link
   railway connect postgres

   # In psql prompt:
   \i database-schema.sql
   \dt  # Verify tables created
   \q
   ```

#### Option B: External Database (Supabase/Neon)
1. Create PostgreSQL database on Supabase or Neon
2. Copy connection string
3. Update `backend/.env` with `DATABASE_URL`
4. Connect and run schema:
   ```bash
   psql "your-connection-string"
   \i backend/database-schema.sql
   ```

### Phase 3: Backend Verification (30 minutes)

```bash
# Test backend health
curl https://pitpulsemobile-production.up.railway.app/health

# Test registration
curl -X POST https://pitpulsemobile-production.up.railway.app/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test123!","username":"testuser"}'

# Test login
curl -X POST https://pitpulsemobile-production.up.railway.app/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test123!"}'

# Test venues endpoint (should require auth or return public data)
curl https://pitpulsemobile-production.up.railway.app/api/venues
```

### Phase 4: Flutter App Testing (2-3 hours)

#### Build Debug APK
```bash
cd mobile
flutter clean
flutter pub get
flutter build apk --debug

# Install on device
adb install build/app/outputs/flutter-apk/app-debug.apk
```

#### Test Critical Flows
- [ ] App launches successfully
- [ ] Registration flow works end-to-end
- [ ] Login flow works end-to-end
- [ ] Token is stored securely
- [ ] API calls succeed with authentication
- [ ] Venues screen loads data from backend
- [ ] Bands screen loads data from backend
- [ ] Profile screen displays user data
- [ ] Navigation works between all screens
- [ ] App handles network errors gracefully
- [ ] App doesn't crash on orientation change

#### Build Release APK (for manual testing)
```bash
cd mobile
flutter build apk --release

# Test on physical device
adb install build/app/outputs/flutter-apk/app-release.apk
```

#### Build iOS (if on macOS)
```bash
cd mobile
flutter build ios --release --no-codesign

# Open in Xcode for signing and testing
open ios/Runner.xcworkspace
```

### Phase 5: App Store Assets (3-4 hours)

#### Required Assets

**App Icons**
- [ ] Android: 512x512 PNG (Play Store listing)
- [ ] iOS: 1024x1024 PNG (App Store listing)
- [ ] Already have: Various sizes in `mobile/android/app/src/main/res/mipmap-*`
- [ ] Already have: iOS icons in `mobile/ios/Runner/Assets.xcassets/AppIcon.appiconset/`

**Screenshots** (minimum 2 per platform)
- [ ] Android: 1080x1920 or 1080x2400 (phone screenshots)
  - Home screen with venue list
  - Venue detail screen
  - Band profile screen
  - User profile with badges
- [ ] iOS: 1290x2796 (iPhone 15 Pro Max) or equivalent
  - Same screens as Android

**Feature Graphic** (Android only)
- [ ] 1024x500 PNG for Play Store header

**Descriptions**

**Short Description** (80 chars max):
```
Discover concert venues, review bands, and track your music experiences.
```

**Long Description** (4000 chars max):
```markdown
🎵 PitPulse - Your Concert Companion

Discover the best concert venues and music bands in your area. Share your live
music experiences, earn badges, and connect with fellow music enthusiasts.

✨ KEY FEATURES

🏛️ Venue Discovery
• Find concert venues near you
• Browse by capacity, amenities, and ratings
• Read reviews from real concert-goers
• View upcoming events

🎸 Band Profiles
• Explore bands by genre
• Read performance reviews
• Follow your favorite artists
• Discover new music

⭐ Review System
• Share your concert experiences
• Rate venues and performances
• Help others with your insights
• Build your concert history

🏆 Achievements
• Earn badges for your activities
• Track your concert-going achievements
• Level up your music enthusiast status

👤 Personal Profile
• Build your music profile
• Track venues you've visited
• See your review history
• Display your earned badges

💫 PERFECT FOR
• Concert enthusiasts
• Music lovers
• Venue explorers
• Live performance fans

🎯 WHY PITPULSE?
• Clean, modern Flutter interface
• Real reviews from real fans
• Comprehensive venue information
• Active music community

📱 BETA VERSION
This is an early beta version. We're actively improving the app based on user
feedback. Please report any issues through the app or via email.

🔒 PRIVACY
We respect your privacy. Your data is encrypted and secure. See our privacy
policy for details.

📧 SUPPORT
Have questions or feedback? Contact us at [your-email]

Download PitPulse today and never miss a great show! 🎤🎶
```

### Phase 6: Privacy Policy Hosting (1 hour)

#### Option A: GitHub Pages (Free & Easy)
```bash
# Create new public repo: pitpulse-privacy
# Upload docs/PRIVACY_POLICY.md as index.html
# Enable GitHub Pages in repo settings

# Result URL: https://yourusername.github.io/pitpulse-privacy/
```

#### Option B: Your Website
```bash
# Upload PRIVACY_POLICY.md to your website
# URL: https://yoursite.com/privacy
```

**Update Privacy Policy**:
- [ ] Add current date
- [ ] Add your contact email
- [ ] Add your address (if required by region)
- [ ] Add app-specific data collection details

### Phase 7: Google Play Console Setup (2-3 hours)

#### Step 1: Create Developer Account
- [ ] Go to [Google Play Console](https://play.google.com/console)
- [ ] Pay $25 one-time registration fee
- [ ] Complete developer profile
- [ ] Add payment method (for future paid apps)

#### Step 2: Create App Listing
- [ ] Click "Create app"
- [ ] App name: **PitPulse**
- [ ] Default language: English (US)
- [ ] App or Game: **App**
- [ ] Free or Paid: **Free**

#### Step 3: Complete Store Listing
- [ ] App name: PitPulse
- [ ] Short description: (80 chars - see above)
- [ ] Full description: (4000 chars - see above)
- [ ] App icon: 512x512 PNG
- [ ] Feature graphic: 1024x500 PNG
- [ ] Screenshots: Upload 2-8 phone screenshots
- [ ] App category: **Music & Audio**
- [ ] Contact email: [your-email]
- [ ] Privacy policy URL: [your-hosted-url]

#### Step 4: Fill Required Declarations

**App Access**:
- [ ] All functionality is available without restrictions ✅
- [ ] No login required for basic browsing

**Ads**:
- [ ] Does your app contain ads? **No**

**Content Rating**:
- [ ] Complete questionnaire
- [ ] Select app category: Music
- [ ] Likely rating: **Everyone** or **Teen**

**Target Audience**:
- [ ] Target age: **13+**
- [ ] Not designed for children

**Data Safety**:
- [ ] Does your app collect or share user data? **Yes**
- [ ] Data collected:
  - Email address (required for account)
  - Username (required for account)
  - User-generated content (reviews, ratings)
  - Location (optional, for venue discovery)
- [ ] Is data encrypted in transit? **Yes** (HTTPS)
- [ ] Can users request data deletion? **Yes**
- [ ] Privacy policy URL: [your-url]

**Permissions**:
- [ ] INTERNET: Required for API communication
- [ ] ACCESS_NETWORK_STATE: Check network connectivity
- [ ] READ_EXTERNAL_STORAGE: (Optional) Select photos for upload
- [ ] CAMERA: (Optional) Take photos for reviews
- [ ] ACCESS_FINE_LOCATION: (Optional) Find nearby venues

### Step 8: Build Release Bundles

#### Android App Bundle (AAB)
```bash
cd mobile
flutter clean
flutter pub get
flutter build appbundle --release

# Output: mobile/build/app/outputs/bundle/release/app-release.aab
# Size: ~15-20 MB (typical for Flutter apps)
```

#### iOS Archive (if on macOS)
```bash
cd mobile
flutter build ipa --release

# Output: mobile/build/ios/archive/Runner.xcarchive
# Open in Xcode for App Store upload
```

#### Step 9: Upload to Internal Testing

**Google Play Console**:
1. Go to "Testing" → "Internal testing"
2. Create new release
3. Upload `app-release.aab`
4. Add release notes:
   ```
   PitPulse Beta v0.1.0

   First beta release! Features:
   - User authentication (register/login)
   - Browse concert venues
   - Explore bands by genre
   - Submit and read reviews
   - Earn achievement badges
   - Personal profile

   Known Issues:
   - Search functionality coming soon
   - Limited to North American venues initially
   - Some placeholder images

   Please report bugs to: [your-email]
   ```
5. Add test users (email addresses)
6. Save and publish to internal testing

**TestFlight (iOS)**:
1. Open Xcode
2. Archive → Upload to App Store Connect
3. In App Store Connect, select build for TestFlight
4. Add beta testers (email addresses)
5. Enable automatic TestFlight submission

---

## 🧪 **BETA TESTING CHECKLIST**

### Pre-Launch Verification
- [ ] Backend health endpoint returns 200 OK
- [ ] Database contains test data
- [ ] User registration works via API
- [ ] User login works via API
- [ ] JWT tokens are being generated
- [ ] Protected endpoints require authentication
- [ ] Android APK installs successfully
- [ ] iOS IPA installs successfully (via TestFlight)
- [ ] No crashes on app launch
- [ ] All screens render correctly

### Critical User Flows
- [ ] New user can register
- [ ] Registered user can login
- [ ] Token persists after app restart
- [ ] Venues list loads from API
- [ ] Venue details screen displays correctly
- [ ] Bands list loads from API
- [ ] Band details screen displays correctly
- [ ] User can submit a review
- [ ] Review appears in venue/band detail
- [ ] User profile displays correctly
- [ ] Badges are displayed (if earned)

### Error Handling
- [ ] App handles no network connection gracefully
- [ ] App handles API timeout gracefully
- [ ] App handles 401 Unauthorized (expired token)
- [ ] App handles 404 Not Found
- [ ] App handles 500 Server Error
- [ ] Form validation works (email, password, etc.)
- [ ] Error messages are user-friendly

### Performance & Stability
- [ ] App loads within 3 seconds
- [ ] Smooth scrolling through lists
- [ ] Images load without blocking UI
- [ ] No memory leaks (test with Android Studio Profiler)
- [ ] No ANR (Application Not Responding) on Android
- [ ] No freezes on iOS
- [ ] App survives orientation changes
- [ ] App survives backgrounding/foregrounding

### Device Testing
- [ ] Test on Android 7.0 (minimum SDK 24)
- [ ] Test on Android 14 (target SDK 34)
- [ ] Test on iOS 12 (minimum version)
- [ ] Test on iOS 17 (latest)
- [ ] Test on phone (normal screen size)
- [ ] Test on tablet (large screen)
- [ ] Test on low-end device (< 2GB RAM)
- [ ] Test on high-end device (flagship)

---

## 📊 **SUCCESS METRICS FOR BETA**

Track these during beta testing (2-4 weeks):

### Adoption
- [ ] Target: 50-100 beta testers
- [ ] Target: >70% complete onboarding (register/login)
- [ ] Target: >50% weekly active users

### Engagement
- [ ] Target: Average session time >3 minutes
- [ ] Target: >5 reviews submitted per week
- [ ] Target: >10 venue views per user

### Quality
- [ ] Target: Crash-free rate >99%
- [ ] Target: <5 critical bugs reported
- [ ] Target: Average rating >4.0 stars (internal feedback)

### Feedback
- [ ] Collect qualitative feedback via email/form
- [ ] Identify top 3 most requested features
- [ ] Identify top 3 usability issues

---

## 🚨 **KNOWN LIMITATIONS & BLOCKERS**

Document for beta testers:

### Current Limitations
1. **Limited Content**: Using Railway backend with limited venue/band data
2. **No Search**: Search functionality not yet implemented
3. **No Filters**: Cannot filter venues by location, capacity, etc.
4. **No Social Features**: Following users, sharing reviews not implemented
5. **No Notifications**: Push notifications not configured
6. **No Offline Mode**: App requires internet connection

### Planned Features (Post-Beta)
- [ ] Search venues and bands
- [ ] Filter by location, genre, capacity
- [ ] Follow other users
- [ ] Share reviews on social media
- [ ] Push notifications for new events
- [ ] Offline caching
- [ ] Dark mode
- [ ] Multiple language support

---

## 📞 **SUPPORT & FEEDBACK**

**Developer**: [Your Name]
**Email**: [your-email]
**GitHub**: [your-github]
**Issue Tracker**: https://github.com/[your-username]/[repo]/issues

**Beta Tester Feedback Form**: [Google Form or TypeForm URL]

---

## ✅ **FINAL PRE-LAUNCH CHECKLIST**

### Critical (Must Have)
- [ ] Backend deployed and tested (Railway)
- [ ] Database initialized with schema
- [ ] Strong JWT_SECRET configured in .env
- [ ] Mobile app connects to production API
- [ ] Android package name is `com.pitpulse.app` (not com.example.*)
- [ ] iOS bundle identifier is `com.pitpulse.app`
- [ ] Android release keystore created and backed up
- [ ] iOS signing configured (for TestFlight)
- [ ] Privacy policy hosted publicly
- [ ] Google Play Developer account created
- [ ] Apple Developer account created (for iOS)
- [ ] App store assets prepared (icons, screenshots)
- [ ] Store listing completed
- [ ] Data Safety form completed (Play Store)
- [ ] Content rating completed
- [ ] Release AAB built and tested
- [ ] Release IPA built and tested (iOS)
- [ ] Beta testers invited (10-20 people)

### Important (Should Have)
- [ ] Error tracking configured (Firebase Crashlytics or Sentry)
- [ ] Analytics configured (Firebase Analytics or Mixpanel)
- [ ] Backend monitoring (Railway metrics)
- [ ] Database backups configured (Railway)
- [ ] Beta release notes prepared
- [ ] Feedback mechanism in place
- [ ] Support email set up

### Nice to Have
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Automated testing (integration tests)
- [ ] Beta tester documentation
- [ ] Video demo/walkthrough
- [ ] Social media presence (@pitpulse)

---

## 🎉 **YOU'RE READY FOR BETA!**

Once all critical items are checked:

1. **Upload AAB to Google Play Console** → Internal Testing
2. **Upload IPA to TestFlight** → External Testing
3. **Invite beta testers** (email list)
4. **Monitor feedback and crashes** (daily for first week)
5. **Iterate and improve** (fix critical bugs within 48 hours)
6. **Gather feedback** (survey after 2 weeks)
7. **Prepare for public launch** (target: 4-6 weeks after beta)

---

## 📚 **REFERENCE DOCUMENTATION**

- [Flutter Deployment Guide](https://docs.flutter.dev/deployment)
- [Android App Signing](https://developer.android.com/studio/publish/app-signing)
- [iOS App Distribution](https://developer.apple.com/documentation/xcode/distributing-your-app-for-beta-testing-and-releases)
- [Google Play Console Help](https://support.google.com/googleplay/android-developer)
- [App Store Connect Help](https://developer.apple.com/help/app-store-connect/)
- `mobile/KEYSTORE_SETUP.md` - Android keystore generation
- `backend/SECURITY_SETUP.md` - Backend security configuration
- `backend/DEPLOYMENT.md` - Backend deployment guide (Railway)
- `docs/PRIVACY_POLICY.md` - Privacy policy template

---

**Good luck with your beta launch! 🚀🎉**
