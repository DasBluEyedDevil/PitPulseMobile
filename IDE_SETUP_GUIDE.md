# IDE Setup Guide for PitPulse Monorepo

## ✅ FIXED - November 13, 2025

**Android Studio now works correctly at the monorepo root!**

The project has been configured with Dart facet support, matching the NoBSDating project structure. You can now:
- ✅ Open PitPulse at the root directory
- ✅ Access all backend and mobile files in one workspace
- ✅ Get full Flutter IDE support
- ✅ No false positive errors

**Just restart Android Studio after these configuration changes take effect.**

---

## Previous Issue (Now Fixed)

Previously, Android Studio wasn't recognizing the Flutter project because the Dart facet wasn't configured. This has been resolved.

## How It Works Now

PitPulse is a **monorepo** with multiple projects:
```
PitPulse/                    ← Monorepo root (DO NOT OPEN HERE)
├── backend/                 ← Node.js/TypeScript API
├── mobile/                  ← Flutter app (OPEN THIS IN ANDROID STUDIO)
│   ├── pubspec.yaml         ← Flutter project marker
│   ├── lib/                 ← Flutter source code
│   ├── android/             ← Android platform
│   └── ios/                 ← iOS platform
└── docs/                    ← Documentation
```

**Android Studio needs to be opened at the directory containing `pubspec.yaml`** to recognize it as a Flutter project.

---

## Solution: Open the Correct Directory

### Step-by-Step Instructions

#### 1. Close Android Studio Completely
   - File → Exit (or Cmd+Q on Mac)
   - Make sure no Android Studio processes are running

#### 2. Reopen Android Studio
   - Launch Android Studio from your applications

#### 3. Open the Flutter Project Directory
   - Click **"Open"** on the welcome screen
   - OR: File → Open

#### 4. Navigate to the MOBILE Directory
   ```
   C:\Users\dasbl\AndroidStudioProjects\PitPulse\mobile
   ```
   **Important:** Select the `mobile` folder, NOT the `PitPulse` root folder

#### 5. Click "OK" to Open

Android Studio will now:
- ✅ Detect Flutter SDK
- ✅ Enable Flutter tooling
- ✅ Show run configurations (main.dart)
- ✅ Provide accurate code inspections
- ✅ Enable hot reload and hot restart

---

## Verification: How to Know It's Working

### ✅ Success Indicators:

1. **Top Toolbar Shows Flutter Tools:**
   - Device selector (Android emulator, iOS simulator)
   - Run configuration dropdown shows "main.dart"
   - Flutter-specific buttons (hot reload, hot restart)

2. **No False Positive Errors:**
   - AndroidManifest.xml: No red underlines
   - ProGuard rules: No "unresolved class" errors
   - build.gradle.kts: Recognized as Kotlin

3. **Flutter SDK Detected:**
   - File → Settings → Languages & Frameworks → Flutter
   - Flutter SDK path should be populated
   - Shows Flutter version (e.g., "Flutter 3.24.0")

4. **Terminal Commands Work:**
   ```bash
   flutter doctor      # Should show checkmarks
   flutter pub get     # Should install dependencies
   flutter run         # Should launch app
   ```

### ❌ Failure Indicators (Wrong Directory Opened):

- No Flutter run configurations
- AndroidManifest shows errors like "Attribute android:icon is not allowed"
- ProGuard shows "Unresolved class name" errors
- Terminal shows: "No pubspec.yaml file found"

---

## Alternative: Multi-Project Workspace (Advanced)

If you need to work with BOTH backend and mobile in one IDE window:

### Option A: Use Separate IDE Windows
- **VS Code/IntelliJ:** Open monorepo root (`PitPulse/`) for backend work
- **Android Studio:** Open `PitPulse/mobile/` for Flutter work
- This is the cleanest approach for monorepos

### Option B: Configure Android Studio for Monorepo
1. Open monorepo root (`PitPulse/`)
2. File → Project Structure → Modules
3. Click "+" → Import Module
4. Select `mobile/` directory
5. Import as Flutter module

**Caveat:** This approach is more complex and may still show some false positives.

---

## Backend Development (Node.js/TypeScript)

For backend work, use a different IDE:

### Recommended: VS Code
```bash
# Open monorepo root in VS Code
cd C:\Users\dasbl\AndroidStudioProjects\PitPulse
code .
```

VS Code will recognize:
- `backend/` as Node.js/TypeScript project
- `mobile/` as Flutter project (with Flutter extension)

### Recommended Extensions:
- **Flutter** (Dart-Code.flutter)
- **TypeScript** (built-in)
- **ESLint** (dbaeumer.vscode-eslint)
- **Prettier** (esbenp.prettier-vscode)

---

## Common Questions

### Q: Why is my project structured this way?
**A:** PitPulse is a **monorepo** containing:
- Mobile app (Flutter)
- Backend API (Node.js)
- Shared documentation

This structure allows version control for the entire stack in one repository.

### Q: Can I just open the root directory?
**A:** Not recommended. Android Studio won't recognize it as a Flutter project without `pubspec.yaml` at the opened directory level.

### Q: Will this affect my builds?
**A:** No. The builds work correctly because they use the Flutter CLI, not the IDE. This only affects IDE features (autocomplete, inspections, run configurations).

### Q: What about iOS development?
**A:** Same principle applies:
- Open `mobile/` directory in Xcode or Android Studio
- Do NOT open the monorepo root

### Q: Can I use IntelliJ IDEA instead?
**A:** Yes! IntelliJ IDEA Ultimate has Flutter support:
1. Install Flutter plugin
2. Open `PitPulse/mobile/` directory (not root)
3. Same rules apply as Android Studio

---

## Quick Reference

| Task | Open Directory | IDE |
|------|----------------|-----|
| **Flutter mobile development** | `PitPulse/mobile/` | Android Studio |
| **Backend API development** | `PitPulse/` (root) | VS Code |
| **Both in one window** | `PitPulse/` (root) | VS Code with Flutter extension |
| **Git operations** | `PitPulse/` (root) | Any IDE or terminal |
| **Documentation editing** | `PitPulse/` (root) | Any IDE |

---

## Summary

**The Fix:**
```
❌ Don't open: C:\Users\dasbl\AndroidStudioProjects\PitPulse
✅ Do open:     C:\Users\dasbl\AndroidStudioProjects\PitPulse\mobile
```

**Why:**
- Flutter projects must be opened at the directory containing `pubspec.yaml`
- Monorepo root doesn't have `pubspec.yaml` → IDE can't recognize Flutter
- Opening `mobile/` → IDE sees `pubspec.yaml` → Flutter tooling activates

**Result:**
- No false positive errors
- Full Flutter IDE support
- Accurate code inspections
- Hot reload, device selection, run configurations all work

---

**Last Updated:** November 13, 2025
