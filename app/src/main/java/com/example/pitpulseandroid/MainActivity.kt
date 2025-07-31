package com.example.pitpulseandroid

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.example.pitpulseandroid.data.model.Band
import com.example.pitpulseandroid.data.model.Venue
import com.example.pitpulseandroid.ui.bands.BandsScreen
import com.example.pitpulseandroid.ui.bands.BandDetailScreen
import com.example.pitpulseandroid.ui.home.HomeScreen
import com.example.pitpulseandroid.ui.profile.ProfileScreen
import com.example.pitpulseandroid.ui.splash.SplashScreen
import com.example.pitpulseandroid.ui.theme.PitPulseAndroidTheme
import com.example.pitpulseandroid.ui.venues.VenuesScreen
import com.example.pitpulseandroid.ui.venues.VenueDetailScreen
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Place
import androidx.compose.material.icons.filled.MusicNote
import androidx.compose.material.icons.filled.Person

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            PitPulseAndroidTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    PitPulseApp()
                }
            }
        }
    }
}

@Composable
fun PitPulseApp() {
    // State to track whether to show splash screen or main app
    var showSplashScreen by remember { mutableStateOf(true) }
    val navController = rememberNavController()

    if (showSplashScreen) {
        // Show splash screen
        SplashScreen(
            onTimeout = { showSplashScreen = false }
        )
    } else {
        // Main app content with navigation
        Scaffold(
            bottomBar = {
                NavigationBar {
                    // Home
                    NavigationBarItem(
                        icon = { Icon(Icons.Filled.Home, contentDescription = "Home") },
                        label = { Text("Home") },
                        selected = navController.currentDestination?.route == "home",
                        onClick = { 
                            if (navController.currentDestination?.route != "home") {
                                navController.navigate("home") {
                                    popUpTo("home") { inclusive = false }
                                    launchSingleTop = true
                                }
                            }
                        }
                    )
                    // Venues
                    NavigationBarItem(
                        icon = { Icon(Icons.Filled.Place, contentDescription = "Venues") },
                        label = { Text("Venues") },
                        selected = navController.currentDestination?.route == "venues",
                        onClick = { 
                            if (navController.currentDestination?.route != "venues") {
                                navController.navigate("venues") {
                                    launchSingleTop = true
                                }
                            }
                        }
                    )
                    // Bands
                    NavigationBarItem(
                        icon = { Icon(Icons.Filled.MusicNote, contentDescription = "Bands") },
                        label = { Text("Bands") },
                        selected = navController.currentDestination?.route == "bands",
                        onClick = { 
                            if (navController.currentDestination?.route != "bands") {
                                navController.navigate("bands") {
                                    launchSingleTop = true
                                }
                            }
                        }
                    )
                    // Profile
                    NavigationBarItem(
                        icon = { Icon(Icons.Filled.Person, contentDescription = "Profile") },
                        label = { Text("Profile") },
                        selected = navController.currentDestination?.route == "profile",
                        onClick = { 
                            if (navController.currentDestination?.route != "profile") {
                                navController.navigate("profile") {
                                    launchSingleTop = true
                                }
                            }
                        }
                    )
                }
            }
        ) { innerPadding ->
            NavHost(
                navController = navController,
                startDestination = "home",
                modifier = Modifier.padding(innerPadding)
            ) {
                composable("home") {
                    HomeScreen(
                        onVenueClick = { venue: Venue -> navController.navigate("venue/${venue.id}") },
                        onBandClick = { band: Band -> navController.navigate("band/${band.id}") },
                        onUserClick = { navController.navigate("profile") },
                        onNotificationClick = { /* Open notifications */ }
                    )
                }
                composable("venues") {
                    VenuesScreen(
                        onVenueClick = { venue -> navController.navigate("venue/${venue.id}") },
                        onBackClick = { navController.popBackStack() }
                    )
                }
                composable("venue/{venueId}") { backStackEntry ->
                    val venueId = backStackEntry.arguments?.getString("venueId")
                    VenueDetailScreen(
                        venueId = venueId ?: "",
                        onBackClick = { navController.popBackStack() }
                    )
                }
                composable("bands") {
                    BandsScreen(
                        onBandClick = { band -> navController.navigate("band/${band.id}") },
                        onBackClick = { navController.popBackStack() }
                    )
                }
                composable("band/{bandId}") { backStackEntry ->
                    val bandId = backStackEntry.arguments?.getString("bandId")
                    BandDetailScreen(
                        bandId = bandId ?: "",
                        onBackClick = { navController.popBackStack() }
                    )
                }
                composable("profile") {
                    ProfileScreen(
                        onBackClick = { navController.popBackStack() }
                    )
                }
            }
        }
    }
}

@Preview(showBackground = true)
@Composable
fun PitPulseAppPreview() {
    PitPulseAndroidTheme {
        PitPulseApp()
    }
}
