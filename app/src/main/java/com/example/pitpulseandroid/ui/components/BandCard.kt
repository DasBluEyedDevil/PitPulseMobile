package com.example.pitpulseandroid.ui.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.example.pitpulseandroid.data.model.Band
import com.example.pitpulseandroid.ui.theme.PitPulseAndroidTheme

/**
 * A card component that displays band information.
 * 
 * @param band The band to display
 * @param onClick Callback when the card is clicked
 * @param modifier Modifier to be applied to the card
 * @param showBio Whether to show the band's bio
 */
@Composable
fun BandCard(
    band: Band,
    onClick: (Band) -> Unit = {},
    modifier: Modifier = Modifier,
    showBio: Boolean = false
) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .clickable { onClick(band) },
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column {
            // Band image
            AsyncImage(
                model = band.image,
                contentDescription = band.name,
                contentScale = ContentScale.Crop,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(160.dp)
                    .clip(MaterialTheme.shapes.medium)
            )

            // Band details
            Column(modifier = Modifier.padding(16.dp)) {
                // Band name
                Text(
                    text = band.name,
                    style = MaterialTheme.typography.titleLarge,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )

                Spacer(modifier = Modifier.height(4.dp))

                // Rating
                RatingComponent(
                    rating = band.rating,
                    reviewCount = band.reviewCount
                )

                Spacer(modifier = Modifier.height(8.dp))

                // Genres
                Row {
                    if (band.genres.isNotEmpty()) {
                        // Use genres list if available
                        band.genres.take(3).forEach { genre ->
                            BadgeComponent(
                                text = genre,
                                modifier = Modifier.padding(end = 4.dp)
                            )
                        }
                    } else if (band.genre.isNotEmpty()) {
                        // Fall back to single genre if genres list is empty
                        BadgeComponent(
                            text = band.genre,
                            modifier = Modifier.padding(end = 4.dp)
                        )
                    }
                }

                // Next show if available
                if (band.nextShow != null) {
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "Next show: ${band.nextShow}",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.primary
                    )
                }

                // Bio if requested and available
                if (showBio && band.bio.isNotEmpty()) {
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = band.bio,
                        style = MaterialTheme.typography.bodyMedium,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }
        }
    }
}

@Preview(showBackground = true)
@Composable
fun BandCardPreview() {
    PitPulseAndroidTheme {
        BandCard(
            band = Band(
                id = "1",
                name = "Radiohead",
                image = "placeholder",
                rating = 4.9,
                reviewCount = 1245,
                genre = "Alternative Rock",
                bio = "Radiohead are an English rock band formed in Abingdon, Oxfordshire, in 1985. The band consists of Thom Yorke, brothers Jonny Greenwood and Colin Greenwood, Ed O'Brien and Philip Selway.",
                performanceRatings = mapOf(
                    "Live Performance" to 4.9,
                    "Crowd Engagement" to 4.7,
                    "Setlist" to 4.8,
                    "Sound Quality" to 4.9
                )
            ),
            modifier = Modifier.padding(16.dp)
        )
    }
}
