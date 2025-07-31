package com.example.pitpulseandroid.ui.splash

import android.content.res.Configuration
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.size
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.example.pitpulseandroid.R
import com.example.pitpulseandroid.ui.theme.PitPulseAndroidTheme
import kotlinx.coroutines.delay

/**
 * Splash screen that displays the app logo.
 * 
 * @param onTimeout Callback when the splash screen timeout is reached
 * @param durationMillis Duration to show the splash screen in milliseconds
 */
@Composable
fun SplashScreen(
    onTimeout: () -> Unit,
    durationMillis: Long = 2000
) {
    // Launch a coroutine to handle the timeout
    LaunchedEffect(key1 = true) {
        delay(durationMillis)
        onTimeout()
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background),
        contentAlignment = Alignment.Center
    ) {
        // Display the app logo
        Image(
            painter = painterResource(id = R.drawable.pit_pulse_logo_vector),
            contentDescription = "PitPulse Logo",
            modifier = Modifier.size(200.dp)
        )
    }
}

@Preview(showBackground = true)
@Preview(showBackground = true, uiMode = Configuration.UI_MODE_NIGHT_YES)
@Composable
fun SplashScreenPreview() {
    PitPulseAndroidTheme {
        SplashScreen(onTimeout = {})
    }
}
