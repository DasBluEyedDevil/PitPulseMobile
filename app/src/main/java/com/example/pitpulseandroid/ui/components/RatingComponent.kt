package com.example.pitpulseandroid.ui.components

import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.automirrored.filled.StarHalf
import androidx.compose.material.icons.filled.StarOutline
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.example.pitpulseandroid.ui.theme.PitPulseAndroidTheme
import com.example.pitpulseandroid.ui.theme.Yellow500

/**
 * A component that displays a rating with stars and review count.
 * 
 * @param rating Rating value from 0 to 5
 * @param reviewCount Number of reviews
 * @param modifier Modifier to be applied to the component
 * @param starSize Size of each star icon
 * @param showReviewCount Whether to show the review count
 */
@Composable
fun RatingComponent(
    rating: Float,
    reviewCount: Int,
    modifier: Modifier = Modifier,
    starSize: Int = 16,
    showReviewCount: Boolean = true
) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = modifier
    ) {
        // Stars
        for (i in 1..5) {
            when {
                rating >= i -> {
                    // Full star
                    Icon(
                        imageVector = Icons.Default.Star,
                        contentDescription = null,
                        tint = Yellow500,
                        modifier = Modifier.size(starSize.dp)
                    )
                }
                rating >= i - 0.5f -> {
                    // Half star
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.StarHalf,
                        contentDescription = null,
                        tint = Yellow500,
                        modifier = Modifier.size(starSize.dp)
                    )
                }
                else -> {
                    // Empty star
                    Icon(
                        imageVector = Icons.Default.StarOutline,
                        contentDescription = null,
                        tint = Yellow500,
                        modifier = Modifier.size(starSize.dp)
                    )
                }
            }
        }

        Spacer(modifier = Modifier.width(4.dp))

        // Review count
        if (showReviewCount) {
            Text(
                text = "($reviewCount)",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

// Overload for Double ratings for compatibility with existing code
@Composable
fun RatingComponent(
    rating: Double,
    reviewCount: Int,
    modifier: Modifier = Modifier,
    starSize: Int = 16,
    showReviewCount: Boolean = true
) {
    RatingComponent(
        rating = rating.toFloat(),
        reviewCount = reviewCount,
        modifier = modifier,
        starSize = starSize,
        showReviewCount = showReviewCount
    )
}

@Preview(showBackground = true)
@Composable
fun RatingComponentPreview() {
    PitPulseAndroidTheme {
        RatingComponent(
            rating = 4.5f,
            reviewCount = 123
        )
    }
}
