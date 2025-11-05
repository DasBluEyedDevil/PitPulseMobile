import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Theme mode options
enum AppThemeMode {
  light,
  dark,
  system,
}

/// Theme state notifier that manages theme mode and persists user preference
class ThemeNotifier extends StateNotifier<AppThemeMode> {
  ThemeNotifier() : super(AppThemeMode.system) {
    _loadTheme();
  }

  static const String _themeKey = 'theme_mode';

  /// Load theme preference from shared preferences
  Future<void> _loadTheme() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final themeModeString = prefs.getString(_themeKey);

      if (themeModeString != null) {
        state = AppThemeMode.values.firstWhere(
          (mode) => mode.toString() == themeModeString,
          orElse: () => AppThemeMode.system,
        );
      }
    } catch (e) {
      // If loading fails, default to system theme
      state = AppThemeMode.system;
    }
  }

  /// Save theme preference to shared preferences
  Future<void> _saveTheme(AppThemeMode mode) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_themeKey, mode.toString());
    } catch (e) {
      // Silently fail if saving fails
    }
  }

  /// Set theme to light mode
  Future<void> setLightTheme() async {
    state = AppThemeMode.light;
    await _saveTheme(AppThemeMode.light);
  }

  /// Set theme to dark mode
  Future<void> setDarkTheme() async {
    state = AppThemeMode.dark;
    await _saveTheme(AppThemeMode.dark);
  }

  /// Set theme to follow system settings
  Future<void> setSystemTheme() async {
    state = AppThemeMode.system;
    await _saveTheme(AppThemeMode.system);
  }

  /// Toggle between light and dark themes
  Future<void> toggleTheme() async {
    if (state == AppThemeMode.light) {
      await setDarkTheme();
    } else {
      await setLightTheme();
    }
  }

  /// Get the actual ThemeMode to use with MaterialApp
  ThemeMode getThemeMode() {
    switch (state) {
      case AppThemeMode.light:
        return ThemeMode.light;
      case AppThemeMode.dark:
        return ThemeMode.dark;
      case AppThemeMode.system:
        return ThemeMode.system;
    }
  }
}

/// Provider for theme state
final themeProvider = StateNotifierProvider<ThemeNotifier, AppThemeMode>((ref) {
  return ThemeNotifier();
});

/// Provider to check if dark mode is currently active
final isDarkModeProvider = Provider<bool>((ref) {
  final themeMode = ref.watch(themeProvider);

  if (themeMode == AppThemeMode.dark) {
    return true;
  } else if (themeMode == AppThemeMode.light) {
    return false;
  }

  // For system mode, we need to check the platform brightness
  // This will be resolved at runtime
  return false;
});
