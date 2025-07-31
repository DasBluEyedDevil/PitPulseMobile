package com.example.pitpulseandroid.ui.home

import androidx.compose.foundation.Image
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.style.TextOverflow
import coil.compose.AsyncImage
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.example.pitpulseandroid.R
import com.example.pitpulseandroid.data.model.Band
import com.example.pitpulseandroid.data.model.Venue
import com.example.pitpulseandroid.ui.components.BandCard
import com.example.pitpulseandroid.ui.components.SearchBarComponent
import com.example.pitpulseandroid.ui.components.VenueCard
import com.example.pitpulseandroid.ui.theme.PitPulseAndroidTheme
import com.example.pitpulseandroid.ui.theme.Purple600

/**
 * Fixed Home screen of the app with proper interactivity.
 * 
 * @param onVenueClick Callback when a venue is clicked
 * @param onBandClick Callback when a band is clicked
 * @param onViewAllVenuesClick Callback when "View All" venues is clicked
 * @param onViewAllBandsClick Callback when "View All" bands is clicked
 * @param onMenuClick Callback when the menu button is clicked
 * @param onNotificationClick Callback when the notification button is clicked
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FixedHomeScreen(
    onVenueClick: (Venue) -> Unit = {},
    onBandClick: (Band) -> Unit = {},
    onViewAllVenuesClick: () -> Unit = {},
    onViewAllBandsClick: () -> Unit = {},
    onMenuClick: () -> Unit = {},
    onNotificationClick: () -> Unit = {},
    venues: List<Venue> = emptyList(),
    bands: List<Band> = emptyList(),
    isLoading: Boolean = false
) {
    var searchQuery by remember { mutableStateOf("") }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Row(
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.Menu,
                            contentDescription = "Menu",
                            tint = Purple600,
                            modifier = Modifier.clickable { onMenuClick() }
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        // Use the logo image instead of text
                        Image(
                            painter = painterResource(id = R.drawable.pit_pulse_logo_vector),
                            contentDescription = "PitPulse Logo",
                            modifier = Modifier.size(40.dp)
                        )
                    }
                },
                actions = {
                    IconButton(onClick = onNotificationClick) {
                        Icon(
                            imageVector = Icons.Default.Notifications,
                            contentDescription = "Notifications"
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.background,
                    titleContentColor = MaterialTheme.colorScheme.onBackground
                )
            )
        }
    ) { paddingValues ->
        if (isLoading) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator(color = Purple600)
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues),
                contentPadding = PaddingValues(16.dp)
            ) {
                // Search bar
                item {
                    SearchBarComponent(
                        onSearch = { query -> searchQuery = query },
                        initialValue = searchQuery
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                }

                // Nearby venues section
                item {
                    SectionHeader(
                        title = "Nearby Venues",
                        onViewAllClick = onViewAllVenuesClick
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                }

                // Venue cards
                items(venues.take(2)) { venue ->
                    VenueCard(
                        venue = venue,
                        onClick = onVenueClick,
                        modifier = Modifier.padding(bottom = 16.dp)
                    )
                }

                // Top rated bands section
                item {
                    Spacer(modifier = Modifier.height(8.dp))
                    SectionHeader(
                        title = "Top Rated Bands",
                        onViewAllClick = onViewAllBandsClick
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                }

                // Band cards
                items(bands.take(2)) { band ->
                    FixedBandCard(
                        band = band,
                        onClick = onBandClick,
                        modifier = Modifier.padding(bottom = 16.dp)
                    )
                }
            }
        }
    }
}

@Composable
private fun SectionHeader(
    title: String,
    onViewAllClick: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = title,
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.weight(1f)
        )
        Text(
            text = "View All",
            style = MaterialTheme.typography.bodyMedium,
            color = Purple600,
            modifier = Modifier.clickable(onClick = onViewAllClick)
        )
    }
}

/**
 * A card component that displays band information.
 * 
 * @param band The band to display
 * @param onClick Callback when the card is clicked
 * @param modifier Modifier to be applied to the card
 */
@Composable
fun FixedBandCard(
    band: Band,
    onClick: (Band) -> Unit = {},
    modifier: Modifier = Modifier
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
                Row(
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = band.rating.toString(),
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Icon(
                        painter = painterResource(id = android.R.drawable.btn_star_big_on),
                        contentDescription = null,
                        tint = Purple600,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = "(${band.reviewCount})",
                        style = MaterialTheme.typography.bodySmall
                    )
                }
            }
        }
    }
}

@Preview(showBackground = true)
@Composable
fun FixedHomeScreenPreview() {
    PitPulseAndroidTheme {
        FixedHomeScreen()
    }
}
