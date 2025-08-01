package com.example.pitpulseandroid.ui.home

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.pitpulseandroid.data.model.Band
import com.example.pitpulseandroid.data.model.Venue
import com.example.pitpulseandroid.data.repository.Repository
import com.example.pitpulseandroid.ui.components.BandCard
import com.example.pitpulseandroid.ui.components.SectionHeader
import com.example.pitpulseandroid.ui.components.VenueCard
import com.example.pitpulseandroid.ui.theme.PitPulseAndroidTheme

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    onVenueClick: (Venue) -> Unit = {},
    onBandClick: (Band) -> Unit = {},
    onUserClick: () -> Unit = {},
    onNotificationClick: () -> Unit = {},
    homeViewModel: HomeViewModel = viewModel(factory = HomeViewModelFactory(Repository()))
) {
    val uiState by homeViewModel.uiState.collectAsState()
    val featuredVenues by homeViewModel.featuredVenues.collectAsState()
    val popularBands by homeViewModel.popularBands.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("PitPulse") },
                actions = {
                    IconButton(onClick = { homeViewModel.refreshData() }) {
                        Icon(
                            imageVector = Icons.Default.Refresh,
                            contentDescription = "Refresh"
                        )
                    }
                    IconButton(onClick = onNotificationClick) {
                        Icon(
                            imageVector = Icons.Default.Notifications,
                            contentDescription = "Notifications"
                        )
                    }
                }
            )
        }
    ) { paddingValues ->
        when {
            uiState.isLoading -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(paddingValues),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator()
                }
            }

            uiState.error != null -> {
                ErrorMessage(
                    error = uiState.error!!,
                    onRetry = { homeViewModel.retryLoading() },
                    modifier = Modifier.padding(paddingValues)
                )
            }

            else -> {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(paddingValues),
                    verticalArrangement = Arrangement.spacedBy(16.dp),
                    contentPadding = PaddingValues(16.dp)
                ) {
                    item {
                        SectionHeader(
                            title = "Featured Venues",
                            onActionClick = { /* Navigate to all venues */ }
                        )
                    }
                    item {
                        VenueRow(
                            venues = featuredVenues,
                            onVenueClick = onVenueClick
                        )
                    }
                    item {
                        SectionHeader(
                            title = "Popular Bands",
                            onActionClick = { /* Navigate to all bands */ }
                        )
                    }
                    items(popularBands) { band ->
                        BandCard(band = band, onBandClick = onBandClick)
                    }
                }
            }
        }
    }
}

@Composable
private fun ErrorMessage(
    error: String,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text(
            text = error,
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.error,
            textAlign = TextAlign.Center
        )

        Spacer(modifier = Modifier.height(16.dp))

        Button(onClick = onRetry) {
            Text("Retry")
        }
    }
}

@Composable
fun VenueRow(
    venues: List<Venue>,
    onVenueClick: (Venue) -> Unit
) {
    LazyRow(
        horizontalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        items(venues) { venue ->
            VenueCard(
                venue = venue,
                onClick = { onVenueClick(venue) }
            )
        }
    }
}

@Suppress("unused")
@Preview(showBackground = true)
@Composable
fun HomeScreenPreview() {
    PitPulseAndroidTheme {
        HomeScreen()
    }
}
