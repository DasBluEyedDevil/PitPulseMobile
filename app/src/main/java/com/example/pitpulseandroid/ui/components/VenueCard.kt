package com.example.pitpulseandroid.ui.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.example.pitpulseandroid.data.model.Venue
import com.example.pitpulseandroid.ui.theme.PitPulseAndroidTheme

/**
 * A card component that displays venue information.
 * 
 * @param venue The venue to display
 * @param onClick Callback when the card is clicked
 * @param modifier Modifier to be applied to the card
 */
@Composable
fun VenueCard(
    venue: Venue,
    onClick: (Venue) -> Unit = {},
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .clickable { onClick(venue) },
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column {
            // Venue image
            AsyncImage(
                model = venue.image,
                contentDescription = venue.name,
                contentScale = ContentScale.Crop,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(160.dp)
                    .clip(MaterialTheme.shapes.medium)
            )
            
            // Venue details
            Column(modifier = Modifier.padding(16.dp)) {
                // Venue name
                Text(
                    text = venue.name,
                    style = MaterialTheme.typography.titleLarge,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                
                Spacer(modifier = Modifier.height(4.dp))
                
                // Rating
                RatingComponent(
                    rating = venue.rating,
                    reviewCount = venue.reviewCount
                )
                
                Spacer(modifier = Modifier.height(8.dp))
                
                // Address and distance
                Row(
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.LocationOn,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = venue.address,
                        style = MaterialTheme.typography.bodyMedium,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = venue.distance,
                        style = MaterialTheme.typography.bodyMedium
                    )
                }
                
                Spacer(modifier = Modifier.height(8.dp))
                
                // Amenities
                Row {
                    venue.amenities.take(3).forEach { amenity ->
                        BadgeComponent(
                            text = amenity,
                            modifier = Modifier.padding(end = 4.dp)
                        )
                    }
                }
            }
        }
    }
}

@Preview(showBackground = true)
@Composable
fun VenueCardPreview() {
    PitPulseAndroidTheme {
        VenueCard(
            venue = Venue(
                id = "1",
                name = "The Fillmore",
                image = "placeholder",
                rating = 4.7,
                reviewCount = 342,
                address = "1805 Geary Blvd, San Francisco, CA",
                distance = "0.8 mi",
                amenities = listOf("Parking", "Food & Drinks", "Accessible"),
                ratings = mapOf(
                    "Sound Quality" to 4.8,
                    "Atmosphere" to 4.9,
                    "Staff" to 4.5,
                    "Value" to 4.2
                )
            ),
            modifier = Modifier.padding(16.dp)
        )
    }
}