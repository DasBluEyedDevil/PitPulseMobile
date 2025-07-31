package com.example.pitpulseandroid.ui.theme

import android.app.Activity
import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsControllerCompat

// Dark theme color scheme based on the web app's dark mode
private val DarkColorScheme = darkColorScheme(
    primary = Purple600,
    onPrimary = Color.White,
    primaryContainer = Purple700,
    onPrimaryContainer = Color.White,
    secondary = DarkSecondary,
    onSecondary = DarkSecondaryForeground,
    tertiary = Purple500,
    background = DarkBackground,
    onBackground = DarkForeground,
    surface = DarkCard,
    onSurface = DarkCardForeground,
    surfaceVariant = DarkAccent,
    onSurfaceVariant = DarkAccentForeground,
    outline = DarkBorder,
    outlineVariant = DarkMuted
)

// Light theme color scheme based on the web app's light mode
private val LightColorScheme = lightColorScheme(
    primary = Purple600,
    onPrimary = Color.White,
    primaryContainer = Purple500,
    onPrimaryContainer = Color.White,
    secondary = LightSecondary,
    onSecondary = LightSecondaryForeground,
    tertiary = Purple700,
    background = LightBackground,
    onBackground = LightForeground,
    surface = LightCard,
    onSurface = LightCardForeground,
    surfaceVariant = LightAccent,
    onSurfaceVariant = LightAccentForeground,
    outline = LightBorder,
    outlineVariant = LightMuted
)

@Composable
fun PitPulseAndroidTheme(
    darkTheme: Boolean = true, // Always use dark theme by default
    dynamicColor: Boolean = false,
    content: @Composable () -> Unit
) {
    val colorScheme = when {
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            val context = LocalContext.current
            if (darkTheme) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
        }
        darkTheme -> DarkColorScheme
        else -> LightColorScheme
    }

    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window

            // Set up the modern approach for window insets
            WindowCompat.setDecorFitsSystemWindows(window, false)

            // Use WindowInsetsControllerCompat for status bar appearance
            WindowInsetsControllerCompat(window, view).apply {
                isAppearanceLightStatusBars = !darkTheme
            }

            // Setting the status bar color to transparent or a color that matches your design
            // This is the modern approach - setting the color to transparent and letting
            // the content draw under the status bar for a seamless look
            window.statusBarColor = Color.Transparent.toArgb()
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}
