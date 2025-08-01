package com.example.pitpulseandroid.ui.common

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign

/**
 * Displays a loading indicator centered on the screen.
 */
@Composable
fun LoadingIndicator() {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        CircularProgressIndicator()
    }
}

/**
 * Displays an error message centered on the screen.
 * 
 * @param message The error message to display
 */
@Composable
fun ErrorState(message: String) {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = message,
            style = MaterialTheme.typography.bodyLarge,
            textAlign = TextAlign.Center,
            color = MaterialTheme.colorScheme.error
        )
    }
}

/**
 * Displays a loading state with the option to show an error message.
 * 
 * @param isLoading Whether content is loading
 * @param error Error message, null if no error
 * @param content Content to display when not loading and no error
 */
@Composable
@Suppress("unused") // Will be used in future implementations
fun <T> LoadingState(
    data: T?,
    isLoading: Boolean,
    error: String? = null,
    content: @Composable (T) -> Unit
) {
    when {
        isLoading -> LoadingIndicator()
        error != null -> ErrorState(message = error)
        data != null -> content(data)
        else -> ErrorState(message = "No data available")
    }
}
