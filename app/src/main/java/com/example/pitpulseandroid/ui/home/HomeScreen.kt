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
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.example.pitpulseandroid.R
import com.example.pitpulseandroid.data.model.Band
import com.example.pitpulseandroid.data.model.Venue
import com.example.pitpulseandroid.ui.components.BandCard
import com.example.pitpulseandroid.ui.components.BottomNavigationBar
import com.example.pitpulseandroid.ui.components.SearchBarComponent
import com.example.pitpulseandroid.ui.components.UserStatsCard
import com.example.pitpulseandroid.ui.components.VenueCard
import com.example.pitpulseandroid.ui.theme.DarkBackground
import com.example.pitpulseandroid.ui.theme.PitPulseAndroidTheme
import com.example.pitpulseandroid.ui.theme.Purple600

/**
 * Home screen of the app.
 * 
 * @param onVenueClick Callback when a venue is clicked
 * @param onBandClick Callback when a band is clicked
 * @param onUserClick Callback when the user stats card is clicked
 * @param onMenuClick Callback when the menu button is clicked
 * @param onNotificationClick Callback when the notification button is clicked
 * @param viewModel ViewModel for the Home screen
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    onVenueClick: (Venue) -> Unit = {},
    onBandClick: (Band) -> Unit = {},
    onUserClick: (String) -> Unit = {},
    onMenuClick: () -> Unit = {},
    onNotificationClick: () -> Unit = {},
    viewModel: HomeViewModel = remember { HomeViewModel(com.example.pitpulseandroid.data.Repository.getInstance()) }
) {
    val uiState by viewModel.uiState.collectAsState()
    var searchQuery by remember { mutableStateOf("") }
    var selectedRoute by remember { mutableStateOf("home") }

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
                            tint = Purple600
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        // Use text for now, as we're having issues with the logo resource
                        Text(
                            text = "PitPulse",
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold,
                            color = Purple600 // Use the brand color to make it stand out
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
        },
        bottomBar = {
            BottomNavigationBar(
                selectedRoute = selectedRoute,
                onRouteSelected = { route ->
                    selectedRoute = route
                    // Here we would typically navigate to the selected route
                    // For now, we'll just log that it was clicked
                    println("Navigation to $route")
                }
            )
        }
    ) { paddingValues ->
        HomeContent(
            uiState = uiState,
            onVenueClick = onVenueClick,
            onBandClick = onBandClick,
            onUserClick = { onUserClick(it.username) },
            onSearch = { query ->
                searchQuery = query
                viewModel.search(query)
            },
            searchQuery = searchQuery,
            contentPadding = paddingValues
        )
    }
}

@Composable
private fun HomeContent(
    uiState: HomeUiState,
    onVenueClick: (Venue) -> Unit,
    onBandClick: (Band) -> Unit,
    onUserClick: (com.example.pitpulseandroid.data.model.User) -> Unit,
    onSearch: (String) -> Unit,
    searchQuery: String,
    contentPadding: PaddingValues
) {
    if (uiState.isLoading) {
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center
        ) {
            CircularProgressIndicator(color = Purple600)
        }
        return
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(contentPadding),
        contentPadding = PaddingValues(16.dp)
    ) {
        // Search bar
        item {
            SearchBarComponent(
                onSearch = onSearch,
                initialValue = searchQuery
            )
            Spacer(modifier = Modifier.height(16.dp))
        }

        // User stats
        item {
            uiState.user?.let { user ->
                UserStatsCard(
                    user = user,
                    onClick = { onUserClick(user) }
                )
                Spacer(modifier = Modifier.height(24.dp))
            }
        }

        // Nearby venues section
        item {
            SectionHeader(
                title = "Nearby Venues",
                onViewAllClick = { /* Navigate to venues list */ 
                    // This would typically navigate to a venues list screen
                    // For now, we'll just log that it was clicked
                    println("View All Venues clicked")
                }
            )
            Spacer(modifier = Modifier.height(8.dp))
        }

        // Venue cards
        items(uiState.venues.take(2)) { venue ->
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
                onViewAllClick = { /* Navigate to bands list */ 
                    // This would typically navigate to a bands list screen
                    // For now, we'll just log that it was clicked
                    println("View All Bands clicked")
                }
            )
            Spacer(modifier = Modifier.height(8.dp))
        }

        // Band cards
        items(uiState.bands.take(2)) { band ->
            BandCard(
                band = band,
                onClick = onBandClick,
                modifier = Modifier.padding(bottom = 16.dp)
            )
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

@Preview(showBackground = true)
@Composable
fun HomeScreenPreview() {
    PitPulseAndroidTheme {
        HomeScreen()
    }
}
