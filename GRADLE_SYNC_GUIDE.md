# 🔧 Gradle Sync & Build Guide

## ✅ Files Fixed

All Gradle configuration files have been corrected:
- ✅ `gradle/libs.versions.toml` - Syntax errors fixed
- ✅ `build.gradle.kts` (root) - KSP plugin added
- ✅ `app/build.gradle.kts` - KSP properly configured

## 📝 Next Steps in Android Studio

### **Step 1: Sync Gradle**

**Option A: Automatic Prompt**
1. Open Android Studio
2. Look for notification bar: "Gradle files have changed since last project sync"
3. Click **"Sync Now"**

**Option B: Manual Sync**
1. Go to **File** → **Sync Project with Gradle Files**
2. Or click the "Sync" icon in the toolbar (elephant with refresh arrow)

**What happens:**
- Gradle downloads all dependencies (~50-100MB)
- First sync takes 3-5 minutes
- Progress shown in "Build" window at bottom
- When done, you'll see "Sync successful"

### **Step 2: Verify Dependencies Downloaded**

Check the "Build" output window for:
```
BUILD SUCCESSFUL in 3m 45s
```

Or check the "Problems" tab - should be empty (except markdown warnings, which are harmless)

### **Step 3: Rebuild Project**

1. **Build** → **Clean Project** (wait for completion)
2. **Build** → **Rebuild Project** (wait for completion)

**Expected result:**
```
BUILD SUCCESSFUL in 1m 23s
```

---

## 🐛 Troubleshooting

### **Error: "Failed to resolve: com.squareup.retrofit2:retrofit:2.9.0"**

**Cause:** Internet connection issue or repository not accessible

**Fix:**
```kotlin
// Add to settings.gradle.kts if not already there
dependencyResolutionManagement {
    repositories {
        google()
        mavenCentral()
        // Add JitPack if needed
        maven { url = uri("https://jitpack.io") }
    }
}
```

Then retry sync.

### **Error: "Could not find com.google.devtools.ksp"**

**Cause:** KSP plugin version mismatch

**Fix:**
Already fixed in the files! Just sync again:
```bash
./gradlew --refresh-dependencies
```

### **Error: "Unsupported class file major version XX"**

**Cause:** Java version mismatch

**Fix:**
1. Go to **File** → **Project Structure**
2. Under "SDK Location", check "JDK location"
3. Should be JDK 11 or higher
4. If not, download JDK 17 from https://adoptium.net/

### **Error: Multiple "Unresolved reference" errors**

**Cause:** Dependencies not downloaded yet

**Fix:**
1. Wait for Gradle sync to complete fully
2. Check "Build" window - should say "BUILD SUCCESSFUL"
3. If sync failed, check error message in "Build" window
4. Try: **File** → **Invalidate Caches** → **Invalidate and Restart**

### **Sync Takes Forever (>10 minutes)**

**Cause:** Slow internet or downloading many dependencies

**Fix:**
1. Check internet connection
2. Wait patiently (first sync can take 5-10 minutes)
3. Check Gradle daemon isn't stuck:
   ```bash
   ./gradlew --stop
   ./gradlew --refresh-dependencies
   ```

### **"Cannot access class 'X'. Check module classpath"**

**Cause:** Build variant mismatch

**Fix:**
1. Go to **Build** → **Select Build Variant**
2. Make sure "debug" is selected for all modules
3. Sync again

---

## 📦 Dependencies Being Downloaded

When you sync, Gradle downloads:

**Networking (6 libraries):**
- Retrofit 2.9.0 (~800KB)
- OkHttp 4.12.0 (~5MB)
- Moshi 1.15.1 (~200KB)
- Converter libraries

**Async Processing:**
- Kotlin Coroutines 1.8.0 (~1.5MB)

**Storage:**
- DataStore 1.1.1 (~300KB)
- Security Crypto (~500KB)

**Total:** ~50-100MB (includes dependencies of dependencies)

---

## ✅ Success Indicators

**Gradle sync successful when you see:**

1. ✅ "BUILD SUCCESSFUL" in Build window
2. ✅ No errors in "Problems" tab (warnings are OK)
3. ✅ Green checkmark next to "Gradle" in toolbar
4. ✅ Can navigate to Retrofit/OkHttp classes (Ctrl+Click works)
5. ✅ Code completion works for new libraries

**Test it:**
1. Open `ApiConfig.kt`
2. Ctrl+Click on "okhttp3" in imports
3. Should open OkHttp source code
4. ✅ If it opens, dependencies are working!

---

## 🔍 Verify Installation

Run this in terminal to verify Gradle setup:

```bash
# Check Gradle wrapper is working
./gradlew --version

# Should show:
# Gradle 8.x
# Kotlin: 2.2.0
# Groovy: x.x.x
# JVM: 11 or higher
```

Test build without running:

```bash
# This should compile everything
./gradlew assembleDebug

# If successful, APK will be at:
# app/build/outputs/apk/debug/app-debug.apk
```

---

## 🎯 After Successful Sync

Once sync is successful, you can:

1. ✅ **Build the app:**
   ```bash
   ./gradlew assembleDebug
   ```

2. ✅ **Run on emulator/device:**
   - Click green "Run" button in Android Studio
   - Or: **Run** → **Run 'app'**

3. ✅ **Continue with Railway deployment:**
   - Backend is ready to deploy
   - API layer is ready to connect
   - Just need to update `ApiConfig.kt` with Railway URL

---

## 📱 Next Steps After Build

1. **Deploy Backend to Railway:**
   - Follow `RAILWAY_QUICK_START.md`
   - Get your API URL

2. **Update API Configuration:**
   - Edit `ApiConfig.kt`
   - Change `PROD_BASE_URL` to your Railway URL

3. **Test with Real API:**
   - Build debug APK
   - Install on device/emulator
   - Test registration, login, venues, bands

4. **Prepare for Beta:**
   - Generate keystore
   - Change package name
   - Build release AAB

---

## 🆘 Still Having Issues?

**Try these in order:**

1. **Clean and Rebuild:**
   ```bash
   ./gradlew clean
   ./gradlew build
   ```

2. **Invalidate Caches:**
   - **File** → **Invalidate Caches** → **Invalidate and Restart**

3. **Delete .gradle folders:**
   ```bash
   rm -rf .gradle
   rm -rf app/build
   ./gradlew clean
   ```

4. **Re-import project:**
   - Close Android Studio
   - Delete `.idea` folder
   - Reopen project in Android Studio

5. **Check Gradle version:**
   - Should be Gradle 8.0+
   - Should be using Gradle wrapper (./gradlew)

---

## 🎉 You're Ready When...

- [x] Gradle sync shows "BUILD SUCCESSFUL"
- [x] No "Unresolved reference" errors
- [x] Can build debug APK: `./gradlew assembleDebug`
- [x] Code completion works for Retrofit/OkHttp
- [x] Can navigate to library classes (Ctrl+Click)

**Then you can:**
- Deploy backend to Railway
- Update API URL
- Test app with real backend
- Continue to beta release!

---

**Current Status:** All files fixed, ready for Gradle sync!  
**Next Action:** Open Android Studio → Sync Gradle → Wait for success → Deploy backend!
