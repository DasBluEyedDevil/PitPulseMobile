import 'package:flutter/material.dart';

/// SoundCheck's glass-neon visual system.
///
/// Legacy color names are intentionally preserved as aliases so older feature
/// widgets can migrate gradually without changing behavior.
class AppTheme {
  AppTheme._();

  // Flash brand assets
  static const String flashWordmarkAsset =
      'assets/brand/flash/flash_logo_wordmark_adobe_express.png';
  static const String flashMarkAsset =
      'assets/brand/flash/flash_mark_cutout.png';
  static const String flashAuthHeroAsset =
      'assets/brand/flash/flash_auth_hero.jpg';
  static const String flashOnboardingHeroAsset =
      'assets/brand/flash/flash_onboarding_hero.jpg';
  static const String flashStageMarkPortraitAsset =
      'assets/brand/flash/flash_stage_mark_portrait.jpg';
  static const String flashPrismPortraitAsset =
      'assets/brand/flash/flash_prism_portrait.jpg';
  static const String flashWavePanoramaAsset =
      'assets/brand/flash/flash_wave_panorama.jpg';
  static const String flashFeedBackdropAsset =
      'assets/brand/flash/flash_feed_backdrop.jpg';
  static const String flashDiscoverBackdropAsset =
      'assets/brand/flash/flash_discover_backdrop.jpg';
  static const String flashProfileWaveAsset =
      'assets/brand/flash/flash_profile_wave.jpg';
  static const String flashProfileHeaderAsset =
      'assets/brand/flash/flash_profile_header.jpg';
  static const String flashShowCardOneAsset =
      'assets/brand/flash/flash_show_card_1.jpg';
  static const String flashShowCardTwoAsset =
      'assets/brand/flash/flash_show_card_2.jpg';
  static const String flashShowCardThreeAsset =
      'assets/brand/flash/flash_show_card_3.jpg';
  static const String flashEmptyStageAsset =
      'assets/brand/flash/flash_empty_stage.jpg';

  // Legacy asset aliases. These intentionally point at the flash roles so old
  // imports compile while screens migrate away from the restrained glass pass.
  static const String logoWideAsset = flashWordmarkAsset;
  static const String markWideAsset = flashMarkAsset;
  static const String markSquareAsset = flashMarkAsset;
  static const String heroAsset = flashStageMarkPortraitAsset;
  static const String placeholderAsset = flashEmptyStageAsset;
  static const String authBackdropAsset = flashAuthHeroAsset;
  static const String onboardingBackdropAsset = flashOnboardingHeroAsset;
  static const String feedBackdropAsset = flashFeedBackdropAsset;
  static const String discoverBackdropAsset = flashDiscoverBackdropAsset;
  static const String profileBackdropAsset = flashProfileWaveAsset;
  static const String checkInBackdropAsset = flashStageMarkPortraitAsset;
  static const String stageTextureAsset = flashWavePanoramaAsset;
  static const String cardCyanAsset = flashShowCardOneAsset;
  static const String cardMagentaAsset = flashShowCardTwoAsset;
  static const String cardVioletAsset = flashShowCardThreeAsset;
  static const String cardSilverAsset = flashEmptyStageAsset;

  // Core flash-neon palette
  static const Color stageBlack = Color(0xFF030713);
  static const Color voidBlack = Color(0xFF00030A);
  static const Color graphite = Color(0xFF08111F);
  static const Color graphiteRaised = Color(0xFF0E1A2D);
  static const Color graphiteHigh = Color(0xFF18243A);
  static const Color glassStroke = Color(0xFF3A5070);
  static const Color chrome = Color(0xFFE9EDF8);
  static const Color brushedSilver = Color(0xFFC7D0E5);
  static const Color mutedSilver = Color(0xFF8E9AB0);
  static const Color deepSilver = Color(0xFF58657C);

  static const Color neonCyan = Color(0xFF00E5FF);
  static const Color neonMagenta = Color(0xFFFF2BF7);
  static const Color neonViolet = Color(0xFF8E3CFF);
  static const Color plasmaBlue = Color(0xFF1D63FF);
  static const Color livePink = Color(0xFFFF35B8);
  static const Color moltenGold = Color(0xFFFFCC4D);
  static const Color signalGreen = Color(0xFF4DFFB2);

  // Compatibility aliases
  static const Color voltLime = neonCyan;
  static const Color voltLimeLight = Color(0xFF8FF6FF);
  static const Color voltLimeDark = Color(0xFF008C9B);
  static const Color electricBlue = neonCyan;
  static const Color hotOrange = livePink;
  static const Color liveIndicator = hotOrange;
  static const Color toastGold = moltenGold;
  static const Color accentCyan = neonCyan;
  static const Color accentAlert = livePink;
  static const Color accentTeal = neonCyan;
  static const Color accentOrange = livePink;

  static const Color textPrimary = chrome;
  static const Color textSecondary = brushedSilver;
  static const Color textTertiary = mutedSilver;
  static const Color textMuted = deepSilver;

  static const Color success = signalGreen;
  static const Color error = Color(0xFFFF5B6E);
  static const Color warning = moltenGold;
  static const Color info = neonCyan;

  static const Color ratingActive = moltenGold;
  static const Color ratingInactive = Color(0xFF333B4E);
  static const Color ratingExcellent = signalGreen;
  static const Color ratingGood = neonCyan;
  static const Color ratingAverage = moltenGold;
  static const Color ratingPoor = error;

  static const Color primary = neonCyan;

  static const LinearGradient primaryGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [neonCyan, plasmaBlue, neonMagenta],
    stops: [0.0, 0.48, 1.0],
  );

  static const LinearGradient checkInGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [neonCyan, plasmaBlue, neonMagenta],
  );

  static const LinearGradient ctaGradient = LinearGradient(
    begin: Alignment.centerLeft,
    end: Alignment.centerRight,
    colors: [Color(0xFF05DAFF), Color(0xFF2B6CFF), Color(0xFFFF22E8)],
    stops: [0.0, 0.52, 1.0],
  );

  static const LinearGradient waveformGradient = LinearGradient(
    begin: Alignment.centerLeft,
    end: Alignment.centerRight,
    colors: [neonCyan, plasmaBlue, neonViolet, neonMagenta],
  );

  static const LinearGradient cardOverlayGradient = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [Color(0x14000000), Color(0x8C020714), Color(0xF0030713)],
    stops: [0.0, 0.48, 1.0],
  );

  static const LinearGradient posterScrimGradient = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [Color(0x33000000), Color(0xA800030A), Color(0xF200030A)],
    stops: [0.0, 0.58, 1.0],
  );

  static const LinearGradient stageGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [voidBlack, stageBlack, Color(0xFF10051E), Color(0xFF070219)],
  );

  static const LinearGradient glassGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xD60D1930), Color(0xB0061020), Color(0x8C160627)],
  );

  static const LinearGradient navChromeGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xE70B172A), Color(0xD3061020), Color(0xDE10051F)],
  );

  // Spacing
  static const double spacing4 = 4.0;
  static const double spacing8 = 8.0;
  static const double spacing12 = 12.0;
  static const double spacing16 = 16.0;
  static const double spacing20 = 20.0;
  static const double spacing24 = 24.0;
  static const double spacing32 = 32.0;
  static const double spacing48 = 48.0;
  static const double spacing64 = 64.0;

  // Border Radius
  static const double radiusSmall = 8.0;
  static const double radiusMedium = 12.0;
  static const double radiusLarge = 16.0;
  static const double radiusXLarge = 24.0;
  static const double radiusFull = 9999.0;

  static const double checkInButtonSize = 64.0;
  static const double checkInButtonElevation = 8.0;

  static List<BoxShadow> neonGlow(
    Color color, {
    double opacity = 0.3,
    double blur = 22,
    double spread = 0,
    Offset offset = Offset.zero,
  }) {
    return [
      BoxShadow(
        color: color.withValues(alpha: opacity),
        blurRadius: blur,
        spreadRadius: spread,
        offset: offset,
      ),
    ];
  }

  static ThemeData darkTheme = ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,
    scaffoldBackgroundColor: stageBlack,
    cardColor: graphiteRaised,
    canvasColor: stageBlack,
    colorScheme: const ColorScheme.dark(
      primary: neonCyan,
      secondary: neonMagenta,
      tertiary: neonViolet,
      surface: graphite,
      surfaceContainerHigh: graphiteRaised,
      surfaceContainerHighest: graphiteHigh,
      error: error,
      onPrimary: voidBlack,
      onSecondary: Colors.white,
      onTertiary: Colors.white,
      onSurface: textPrimary,
      onError: Colors.white,
    ),
    appBarTheme: const AppBarTheme(
      elevation: 0,
      centerTitle: false,
      scrolledUnderElevation: 0,
      backgroundColor: Colors.transparent,
      foregroundColor: textPrimary,
      titleTextStyle: TextStyle(
        fontSize: 24,
        fontWeight: FontWeight.w800,
        color: textPrimary,
        letterSpacing: 0,
      ),
      iconTheme: IconThemeData(color: textPrimary),
    ),
    cardTheme: CardThemeData(
      elevation: 0,
      color: graphiteRaised.withValues(alpha: 0.86),
      margin: const EdgeInsets.symmetric(
        horizontal: spacing16,
        vertical: spacing8,
      ),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(radiusLarge),
        side: BorderSide(color: neonCyan.withValues(alpha: 0.16)),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: graphiteHigh.withValues(alpha: 0.76),
      hintStyle: const TextStyle(color: textTertiary),
      labelStyle: const TextStyle(color: textSecondary),
      prefixIconColor: textSecondary,
      suffixIconColor: textSecondary,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(radiusLarge),
        borderSide: BorderSide(color: glassStroke.withValues(alpha: 0.7)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(radiusLarge),
        borderSide: BorderSide(color: glassStroke.withValues(alpha: 0.55)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(radiusLarge),
        borderSide: const BorderSide(color: neonCyan, width: 1.4),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(radiusLarge),
        borderSide: const BorderSide(color: error, width: 1),
      ),
      focusedErrorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(radiusLarge),
        borderSide: const BorderSide(color: error, width: 1.4),
      ),
      contentPadding: const EdgeInsets.symmetric(
        horizontal: spacing20,
        vertical: spacing16,
      ),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: neonCyan,
        foregroundColor: voidBlack,
        minimumSize: const Size.fromHeight(56),
        padding: const EdgeInsets.symmetric(
          horizontal: spacing32,
          vertical: spacing16,
        ),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(radiusLarge),
        ),
        elevation: 0,
        shadowColor: neonCyan.withValues(alpha: 0.35),
        textStyle: const TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.w800,
          letterSpacing: 0,
        ),
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: neonCyan,
        foregroundColor: voidBlack,
        minimumSize: const Size.fromHeight(56),
        padding: const EdgeInsets.symmetric(
          horizontal: spacing32,
          vertical: spacing16,
        ),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(radiusLarge),
        ),
        elevation: 0,
        textStyle: const TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.w800,
          letterSpacing: 0,
        ),
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        foregroundColor: neonCyan,
        padding: const EdgeInsets.symmetric(
          horizontal: spacing20,
          vertical: spacing12,
        ),
        textStyle: const TextStyle(
          fontSize: 15,
          fontWeight: FontWeight.w700,
          letterSpacing: 0,
        ),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: textPrimary,
        side: BorderSide(color: neonCyan.withValues(alpha: 0.68), width: 1.3),
        minimumSize: const Size.fromHeight(56),
        padding: const EdgeInsets.symmetric(
          horizontal: spacing32,
          vertical: spacing16,
        ),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(radiusLarge),
        ),
        textStyle: const TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.w700,
          letterSpacing: 0,
        ),
      ),
    ),
    bottomNavigationBarTheme: const BottomNavigationBarThemeData(
      backgroundColor: graphite,
      selectedItemColor: neonCyan,
      unselectedItemColor: mutedSilver,
      type: BottomNavigationBarType.fixed,
      elevation: 0,
      selectedLabelStyle: TextStyle(fontWeight: FontWeight.w700, fontSize: 11),
      unselectedLabelStyle: TextStyle(
        fontWeight: FontWeight.w500,
        fontSize: 11,
      ),
    ),
    chipTheme: ChipThemeData(
      backgroundColor: graphiteHigh.withValues(alpha: 0.82),
      selectedColor: neonCyan.withValues(alpha: 0.2),
      deleteIconColor: textSecondary,
      labelStyle: const TextStyle(
        color: textPrimary,
        fontWeight: FontWeight.w600,
        fontSize: 13,
      ),
      secondaryLabelStyle: const TextStyle(
        color: neonCyan,
        fontWeight: FontWeight.w700,
      ),
      padding: const EdgeInsets.symmetric(
        horizontal: spacing12,
        vertical: spacing8,
      ),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(radiusFull),
        side: BorderSide(color: neonCyan.withValues(alpha: 0.26)),
      ),
    ),
    floatingActionButtonTheme: const FloatingActionButtonThemeData(
      backgroundColor: neonCyan,
      foregroundColor: voidBlack,
      elevation: 4,
      shape: CircleBorder(),
      sizeConstraints: BoxConstraints.tightFor(
        width: checkInButtonSize,
        height: checkInButtonSize,
      ),
    ),
    dividerTheme: DividerThemeData(
      color: glassStroke.withValues(alpha: 0.5),
      thickness: 1,
      space: spacing16,
    ),
    tabBarTheme: const TabBarThemeData(
      labelColor: neonCyan,
      unselectedLabelColor: mutedSilver,
      indicatorColor: neonCyan,
      indicatorSize: TabBarIndicatorSize.label,
      labelStyle: TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
      unselectedLabelStyle: TextStyle(
        fontSize: 14,
        fontWeight: FontWeight.w500,
      ),
    ),
    textTheme: const TextTheme(
      displayLarge: TextStyle(
        fontSize: 40,
        fontWeight: FontWeight.w900,
        color: textPrimary,
        letterSpacing: 0,
        height: 1.12,
      ),
      displayMedium: TextStyle(
        fontSize: 32,
        fontWeight: FontWeight.w900,
        color: textPrimary,
        letterSpacing: 0,
        height: 1.15,
      ),
      displaySmall: TextStyle(
        fontSize: 28,
        fontWeight: FontWeight.w800,
        color: textPrimary,
        letterSpacing: 0,
        height: 1.2,
      ),
      headlineLarge: TextStyle(
        fontSize: 24,
        fontWeight: FontWeight.w800,
        color: textPrimary,
        letterSpacing: 0,
        height: 1.25,
      ),
      headlineMedium: TextStyle(
        fontSize: 20,
        fontWeight: FontWeight.w800,
        color: textPrimary,
        letterSpacing: 0,
        height: 1.35,
      ),
      headlineSmall: TextStyle(
        fontSize: 18,
        fontWeight: FontWeight.w800,
        color: textPrimary,
        letterSpacing: 0,
        height: 1.35,
      ),
      titleLarge: TextStyle(
        fontSize: 18,
        fontWeight: FontWeight.w700,
        color: textPrimary,
        letterSpacing: 0,
        height: 1.35,
      ),
      titleMedium: TextStyle(
        fontSize: 16,
        fontWeight: FontWeight.w700,
        color: textPrimary,
        letterSpacing: 0,
        height: 1.45,
      ),
      titleSmall: TextStyle(
        fontSize: 14,
        fontWeight: FontWeight.w700,
        color: textPrimary,
        letterSpacing: 0,
        height: 1.45,
      ),
      bodyLarge: TextStyle(
        fontSize: 16,
        fontWeight: FontWeight.normal,
        color: textPrimary,
        letterSpacing: 0,
        height: 1.55,
      ),
      bodyMedium: TextStyle(
        fontSize: 14,
        fontWeight: FontWeight.normal,
        color: textPrimary,
        letterSpacing: 0,
        height: 1.55,
      ),
      bodySmall: TextStyle(
        fontSize: 12,
        fontWeight: FontWeight.normal,
        color: textSecondary,
        letterSpacing: 0,
        height: 1.45,
      ),
      labelLarge: TextStyle(
        fontSize: 14,
        fontWeight: FontWeight.w700,
        color: textPrimary,
        letterSpacing: 0,
        height: 1.35,
      ),
      labelMedium: TextStyle(
        fontSize: 12,
        fontWeight: FontWeight.w700,
        color: textPrimary,
        letterSpacing: 0,
        height: 1.35,
      ),
      labelSmall: TextStyle(
        fontSize: 11,
        fontWeight: FontWeight.w600,
        color: textSecondary,
        letterSpacing: 0,
        height: 1.35,
      ),
    ),
    iconTheme: const IconThemeData(color: textPrimary, size: 24),
    progressIndicatorTheme: const ProgressIndicatorThemeData(color: neonCyan),
    sliderTheme: SliderThemeData(
      activeTrackColor: neonCyan,
      inactiveTrackColor: graphiteHigh,
      thumbColor: neonCyan,
      overlayColor: neonCyan.withValues(alpha: 0.18),
      valueIndicatorColor: neonCyan,
      valueIndicatorTextStyle: const TextStyle(
        color: voidBlack,
        fontWeight: FontWeight.w800,
      ),
    ),
    switchTheme: SwitchThemeData(
      thumbColor: WidgetStateProperty.resolveWith((states) {
        if (states.contains(WidgetState.selected)) {
          return neonCyan;
        }
        return textTertiary;
      }),
      trackColor: WidgetStateProperty.resolveWith((states) {
        if (states.contains(WidgetState.selected)) {
          return neonCyan.withValues(alpha: 0.45);
        }
        return graphiteHigh;
      }),
    ),
    bottomSheetTheme: const BottomSheetThemeData(
      backgroundColor: graphite,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(radiusXLarge)),
      ),
    ),
    dialogTheme: DialogThemeData(
      backgroundColor: graphite,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(radiusLarge),
        side: BorderSide(color: neonCyan.withValues(alpha: 0.16)),
      ),
    ),
    snackBarTheme: SnackBarThemeData(
      backgroundColor: graphiteRaised,
      contentTextStyle: const TextStyle(color: textPrimary),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(radiusMedium),
      ),
      behavior: SnackBarBehavior.floating,
    ),
  );

  static ThemeData lightTheme = ThemeData(
    useMaterial3: true,
    brightness: Brightness.light,
    scaffoldBackgroundColor: const Color(0xFFF3F6FB),
    colorScheme: const ColorScheme.light(
      primary: Color(0xFF006D7A),
      secondary: Color(0xFF9E128E),
      tertiary: Color(0xFF4B37B7),
      surface: Colors.white,
      surfaceContainerHigh: Color(0xFFE9EEF6),
      surfaceContainerHighest: Color(0xFFDDE5F0),
      error: error,
      onPrimary: Colors.white,
      onSecondary: Colors.white,
      onSurface: Color(0xFF121721),
      onError: Colors.white,
    ),
    appBarTheme: const AppBarTheme(
      elevation: 0,
      centerTitle: false,
      scrolledUnderElevation: 0,
      backgroundColor: Colors.white,
      foregroundColor: Color(0xFF121721),
      titleTextStyle: TextStyle(
        fontSize: 24,
        fontWeight: FontWeight.w800,
        color: Color(0xFF121721),
        letterSpacing: 0,
      ),
      iconTheme: IconThemeData(color: Color(0xFF121721)),
    ),
    cardTheme: CardThemeData(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(radiusLarge),
        side: const BorderSide(color: Color(0xFFD8DFEA), width: 1),
      ),
      color: Colors.white,
      margin: const EdgeInsets.symmetric(
        horizontal: spacing16,
        vertical: spacing8,
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: const Color(0xFFE9EEF6),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(radiusLarge),
        borderSide: BorderSide.none,
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(radiusLarge),
        borderSide: BorderSide.none,
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(radiusLarge),
        borderSide: const BorderSide(color: Color(0xFF006D7A), width: 1.2),
      ),
      contentPadding: const EdgeInsets.symmetric(
        horizontal: spacing20,
        vertical: spacing16,
      ),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: const Color(0xFF006D7A),
        foregroundColor: Colors.white,
        minimumSize: const Size.fromHeight(56),
        padding: const EdgeInsets.symmetric(
          horizontal: spacing32,
          vertical: spacing16,
        ),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(radiusLarge),
        ),
        elevation: 0,
        textStyle: const TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.w800,
          letterSpacing: 0,
        ),
      ),
    ),
    bottomNavigationBarTheme: const BottomNavigationBarThemeData(
      backgroundColor: Colors.white,
      selectedItemColor: Color(0xFF006D7A),
      unselectedItemColor: Color(0xFF667085),
      type: BottomNavigationBarType.fixed,
      elevation: 8,
    ),
    chipTheme: ChipThemeData(
      backgroundColor: const Color(0xFFE9EEF6),
      selectedColor: const Color(0xFF006D7A).withValues(alpha: 0.14),
      labelStyle: const TextStyle(
        color: Color(0xFF121721),
        fontWeight: FontWeight.w600,
        fontSize: 13,
      ),
      padding: const EdgeInsets.symmetric(
        horizontal: spacing12,
        vertical: spacing8,
      ),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(radiusFull),
      ),
    ),
    floatingActionButtonTheme: const FloatingActionButtonThemeData(
      backgroundColor: Color(0xFF006D7A),
      foregroundColor: Colors.white,
      elevation: checkInButtonElevation,
      shape: CircleBorder(),
      sizeConstraints: BoxConstraints.tightFor(
        width: checkInButtonSize,
        height: checkInButtonSize,
      ),
    ),
    tabBarTheme: const TabBarThemeData(
      labelColor: Color(0xFF006D7A),
      unselectedLabelColor: Color(0xFF667085),
      indicatorColor: Color(0xFF006D7A),
      indicatorSize: TabBarIndicatorSize.label,
    ),
  );
}
