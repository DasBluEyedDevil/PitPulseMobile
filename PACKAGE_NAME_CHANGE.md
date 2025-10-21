# 📦 Package Name Change Instructions

## Current Package Name Issue

The app currently uses `com.example.pitpulseandroid` which:
- Contains "example" - inappropriate for production
- Cannot be changed after publishing to Google Play Store
- Should be changed to something like `com.pitpulse.android` or `com.yourcompany.pitpulse`

## ⚠️ IMPORTANT: Do This BEFORE First Play Store Upload!

Once you publish with a package name, it's permanent. You MUST change it before your first upload.

## Recommended Package Names

Choose one of these formats:
- `com.pitpulse.android` (if you own pitpulse.com)
- `com.yourname.pitpulse` (using your name/company)
- `io.pitpulse.android` (if you own pitpulse.io)
- `app.pitpulse.android` (modern convention)

## How to Change Package Name in Android Studio

### Method 1: Using Android Studio (Recommended)

1. **Open the project in Android Studio**

2. **Disable Compact Middle Packages:**
   - In Project view, click the gear icon ⚙️
   - Uncheck "Compact Middle Packages"

3. **Refactor the package:**
   - Right-click on `com` in `app/src/main/java`
   - Select: Refactor → Rename
   - Choose "Rename Directory"
   - Enter new first part (e.g., change `com` to your domain)
   
   - Right-click on `example` 
   - Select: Refactor → Rename
   - Choose "Rename Directory"
   - Enter your company/product name
   
   - Right-click on `pitpulseandroid`
   - Select: Refactor → Rename  
   - Choose "Rename Directory"
   - Enter `pitpulse` or keep as is

4. **Update in build.gradle.kts:**
   - Open `app/build.gradle.kts`
   - Change `applicationId = "com.example.pitpulseandroid"`
   - To: `applicationId = "com.pitpulse.android"` (or your chosen name)

5. **Update AndroidManifest.xml:**
   - Should update automatically, but verify the package name

6. **Update all imports:**
   - Android Studio will prompt you to update imports
   - Click "Refactor" in all dialogs that appear

7. **Clean and Rebuild:**
   ```bash
   ./gradlew clean
   ./gradlew build
   ```

### Method 2: Manual Steps

If the above doesn't work, follow these manual steps:

1. **Update build.gradle.kts:**
```kotlin
android {
    namespace = "com.pitpulse.android"
    
    defaultConfig {
        applicationId = "com.pitpulse.android"
        ...
    }
}
```

2. **Create new package structure:**
   - Create folders: `app/src/main/java/com/pitpulse/android`
   - Move all `.kt` files to the new structure
   - Update package declarations at top of each file

3. **Update imports throughout the project**

4. **Delete old package folders**

5. **Clean and rebuild**

## Files to Update After Package Change

Double-check these files have the correct package name:

- [ ] `app/build.gradle.kts` - `applicationId` and `namespace`
- [ ] `app/src/main/AndroidManifest.xml` - package attribute
- [ ] All `.kt` files - package declarations at top
- [ ] All import statements
- [ ] `proguard-rules.pro` - if you have package-specific rules

## Verification Steps

After changing the package name:

1. **Clean build:**
   ```bash
   ./gradlew clean
   ```

2. **Build app:**
   ```bash
   ./gradlew assembleDebug
   ```

3. **Run on device/emulator**
   - Uninstall old version first
   - Install and test new version

4. **Verify package name:**
   ```bash
   aapt dump badging app/build/outputs/apk/debug/app-debug.apk | grep package
   ```

## What Package Name Should I Use?

### If you own a domain:
- `com.yourdomain.pitpulse` (for yourdomain.com)
- `io.yourdomain.pitpulse` (for yourdomain.io)

### If you don't own a domain:
- `com.yourname.pitpulse` (use your name)
- `app.pitpulse.android` (modern convention, no domain needed)

### For this project specifically:
I recommend: **`com.pitpulse.android`** (simple and clean)

## Example: Changing to com.pitpulse.android

If you choose `com.pitpulse.android`, you need to:

1. Change folder structure from:
   ```
   app/src/main/java/com/example/pitpulseandroid/
   ```
   to:
   ```
   app/src/main/java/com/pitpulse/android/
   ```

2. Update every .kt file's package declaration from:
   ```kotlin
   package com.example.pitpulseandroid
   ```
   to:
   ```kotlin
   package com.pitpulse.android
   ```

3. Update imports in all files from:
   ```kotlin
   import com.example.pitpulseandroid.data.model.Venue
   ```
   to:
   ```kotlin
   import com.pitpulse.android.data.model.Venue
   ```

4. Update build.gradle.kts:
   ```kotlin
   applicationId = "com.pitpulse.android"
   namespace = "com.pitpulse.android"
   ```

## Troubleshooting

### "Cannot resolve symbol" errors
- Do Find & Replace for old package name
- Sync gradle files
- Invalidate Caches / Restart in Android Studio

### App won't install
- Uninstall the old version completely
- Clear app data
- Try installing again

### Build fails
- Run `./gradlew clean`
- Delete `.gradle` and `.idea` folders
- Re-sync project with Gradle files
