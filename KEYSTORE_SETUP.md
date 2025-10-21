# 🔐 Keystore Setup Instructions

## Generate Release Keystore

To create a signed release build for Google Play Store, you need to generate a keystore file.

### Step 1: Generate the Keystore

Run this command in the project root directory:

```bash
keytool -genkey -v -keystore pitpulse-release-key.keystore \
  -alias pitpulse \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

You will be prompted to enter:
- **Keystore password:** Choose a strong password (save it securely!)
- **Key password:** Choose a strong password (can be same as keystore password)
- **Distinguished Name fields:**
  - First and Last Name: Your name or company name
  - Organizational Unit: Your team/department
  - Organization: Your company name
  - City/Locality: Your city
  - State/Province: Your state
  - Country Code: Two-letter country code (e.g., US, UK)

### Step 2: Secure the Keystore

**IMPORTANT:** Never commit your keystore or passwords to version control!

1. Move the keystore to a secure location:
```bash
# The keystore will be in the project root
# Keep it there but ensure it's in .gitignore
```

2. Add to `.gitignore`:
```
# Keystore files
*.keystore
*.jks
keystore.properties
```

### Step 3: Create Keystore Properties File

Create `keystore.properties` in the project root:

```properties
storePassword=YOUR_KEYSTORE_PASSWORD
keyPassword=YOUR_KEY_PASSWORD
keyAlias=pitpulse
storeFile=pitpulse-release-key.keystore
```

**Replace the passwords with your actual passwords!**

### Step 4: Update build.gradle.kts

The `app/build.gradle.kts` file needs to be updated to use the keystore.

Uncomment the signingConfig line in the release build type:

```kotlin
android {
    // Load keystore properties
    val keystorePropertiesFile = rootProject.file("keystore.properties")
    val keystoreProperties = Properties()
    if (keystorePropertiesFile.exists()) {
        keystoreProperties.load(FileInputStream(keystorePropertiesFile))
    }
    
    signingConfigs {
        create("release") {
            storeFile = file(keystoreProperties["storeFile"] ?: "pitpulse-release-key.keystore")
            storePassword = keystoreProperties["storePassword"] as String?
            keyAlias = keystoreProperties["keyAlias"] as String?
            keyPassword = keystoreProperties["keyPassword"] as String?
        }
    }
    
    buildTypes {
        release {
            signingConfig = signingConfigs.getByName("release")
            ...
        }
    }
}
```

### Step 5: Build Release APK/AAB

Once configured, build a signed release:

```bash
# Build AAB for Play Store (recommended)
./gradlew bundleRelease

# Build APK for manual distribution
./gradlew assembleRelease
```

Output locations:
- **AAB:** `app/build/outputs/bundle/release/app-release.aab`
- **APK:** `app/build/outputs/apk/release/app-release.apk`

## Backup Your Keystore

**CRITICAL:** If you lose your keystore, you cannot update your app on Google Play!

1. Save your keystore file in a secure, backed-up location
2. Save your passwords in a password manager
3. Consider creating a backup copy in a different physical location
4. For teams: Use a secure shared storage (encrypted)

## Security Checklist

- [ ] Keystore file generated
- [ ] Keystore password saved securely
- [ ] Key password saved securely
- [ ] Keystore added to `.gitignore`
- [ ] `keystore.properties` added to `.gitignore`
- [ ] Keystore backed up to secure location
- [ ] Build.gradle updated with signing config
- [ ] Test release build created successfully

## Troubleshooting

### Error: "Keystore was tampered with, or password was incorrect"
- Check that your passwords in `keystore.properties` are correct
- Ensure there are no extra spaces in the properties file

### Error: "Failed to read key from keystore"
- Verify the keyAlias matches what you used during generation
- Check that the storeFile path is correct

### Build succeeds but app crashes on launch
- This is likely a ProGuard issue, not signing
- Check `proguard-rules.pro` configuration
- Test with `isMinifyEnabled = false` first to isolate the issue
