package com.example.pitpulseandroid.ui.components

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.example.pitpulseandroid.ui.theme.PitPulseAndroidTheme
import com.example.pitpulseandroid.ui.theme.Purple600

/**
 * A simple avatar component that displays a user's profile image or initials.
 * 
 * @param imageUrl The URL or resource name of the image to display
 * @param modifier Modifier to be applied to the avatar
 * @param size The size of the avatar
 * @param fallbackText Text to display if the image is not available
 */
@Composable
fun AvatarComponent(
    imageUrl: String,
    modifier: Modifier = Modifier,
    size: Dp = 40.dp,
    fallbackText: String = ""
) {
    // If no image URL is provided or it's empty, show the fallback
    if (imageUrl.isEmpty()) {
        FallbackAvatar(size, fallbackText, modifier)
        return
    }

    // For remote images (URLs)
    if (imageUrl.startsWith("http")) {
        Box(
            modifier = modifier
                .size(size)
                .clip(CircleShape),
            contentAlignment = Alignment.Center
        ) {
            AsyncImage(
                model = ImageRequest.Builder(LocalContext.current)
                    .data(imageUrl)
                    .crossfade(true)
                    .build(),
                contentDescription = "Avatar",
                contentScale = ContentScale.Crop,
                modifier = Modifier.size(size)
            )
        }
        return
    }

    // For local drawable resources
    val context = LocalContext.current
    val resourceId = remember(imageUrl) {
        context.resources.getIdentifier(
            imageUrl, "drawable", context.packageName
        )
    }

    if (resourceId != 0) {
        Box(
            modifier = modifier
                .size(size)
                .clip(CircleShape),
            contentAlignment = Alignment.Center
        ) {
            Image(
                painter = painterResource(id = resourceId),
                contentDescription = "Avatar",
                contentScale = ContentScale.Crop,
                modifier = Modifier.size(size)
            )
        }
    } else {
        FallbackAvatar(size, fallbackText, modifier)
    }
}

@Composable
private fun FallbackAvatar(size: Dp, fallbackText: String, modifier: Modifier = Modifier) {
    Box(
        modifier = modifier
            .size(size)
            .clip(CircleShape)
            .background(Purple600),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = fallbackText.take(2).uppercase(),
            color = Color.White,
            textAlign = TextAlign.Center,
            style = MaterialTheme.typography.bodyLarge
        )
    }
}

@Preview(showBackground = true)
@Composable
fun AvatarComponentPreview() {
    PitPulseAndroidTheme {
        AvatarComponent(
            imageUrl = "",
            fallbackText = "User"
        )
    }
}
