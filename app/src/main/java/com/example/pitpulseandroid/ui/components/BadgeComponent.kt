package com.example.pitpulseandroid.ui.components

import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.example.pitpulseandroid.ui.theme.PitPulseAndroidTheme
import com.example.pitpulseandroid.ui.theme.Purple600

/**
 * A badge component that displays a small piece of information.
 * 
 * @param text The text to display in the badge
 * @param modifier Modifier to be applied to the badge
 * @param backgroundColor Background color of the badge (defaults to theme's secondary container or Purple600)
 * @param contentColor Text color of the badge (defaults to theme's on secondary container or White)
 * @param useThemeColors Whether to use theme colors or custom colors
 */
@Composable
fun BadgeComponent(
    text: String,
    modifier: Modifier = Modifier,
    backgroundColor: Color = Purple600,
    contentColor: Color = Color.White,
    useThemeColors: Boolean = false
) {
    val bgColor = if (useThemeColors) MaterialTheme.colorScheme.secondaryContainer else backgroundColor
    val txtColor = if (useThemeColors) MaterialTheme.colorScheme.onSecondaryContainer else contentColor

    Surface(
        color = bgColor,
        contentColor = txtColor,
        shape = RoundedCornerShape(16.dp),
        modifier = modifier
    ) {
        Text(
            text = text,
            textAlign = TextAlign.Center,
            style = MaterialTheme.typography.labelMedium,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
        )
    }
}

@Preview(showBackground = true)
@Composable
fun BadgeComponentPreview() {
    PitPulseAndroidTheme {
        BadgeComponent(text = "Rock")
    }
}
