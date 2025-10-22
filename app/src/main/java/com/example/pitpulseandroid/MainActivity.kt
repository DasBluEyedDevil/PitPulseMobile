package com.example.pitpulseandroid

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.EmojiEvents
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.MusicNote
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Place
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.tooling.preview.Preview
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.example.pitpulseandroid.data.model.Band
import com.example.pitpulseandroid.data.model.Venue
import com.example.pitpulseandroid.navigation.Screen
import com.example.pitpulseandroid.ui.badges.BadgesScreen
import com.example.pitpulseandroid.ui.bands.BandDetailScreen
import com.example.pitpulseandroid.ui.bands.BandsScreen
import com.example.pitpulseandroid.ui.home.HomeScreen
import com.example.pitpulseandroid.ui.profile.ProfileScreen
import com.example.pitpulseandroid.ui.splash.SplashScreen
import com.example.pitpulseandroid.ui.theme.PitPulseAndroidTheme
import com.example.pitpulseandroid.ui.venues.VenueDetailScreen
import com.example.pitpulseandroid.ui.venues.VenuesScreen
import com.example.pitpulseandroid.util.NavigationUtils.getStringArgument
import com.example.pitpulseandroid.util.NavigationUtils.navigateSingleTop

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
    // State to track whether to show splash screen or main app - use rememberSaveable to preserve state
    var showSplashScreen by rememberSaveable { mutableStateOf(true) }
    val navController = rememberNavController()

    // Clean up any resources when the composable is disposed
    DisposableEffect(Unit) {
        onDispose {}
    }

    if (showSplashScreen) {
        // Show splash screen
        SplashScreen(
            onTimeout = { showSplashScreen = false }
        )
    } else {
        // Main app content with navigation
        MainContent(navController)
    }
}

@Composable
fun MainContent(navController: NavHostController) {
    // Observe current back stack entry for navigation state
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route

    // Define tabs
    val tabs = listOf(
        TabItem(Screen.Home, Icons.Filled.Home, "Home"),
        TabItem(Screen.Venues, Icons.Filled.Place, "Venues"),
        TabItem(Screen.Bands, Icons.Filled.MusicNote, "Bands"),
        TabItem(Screen.Profile, Icons.Filled.Person, "Profile"),
        TabItem(Screen.Badges, Icons.Filled.EmojiEvents, "Badges")
    )

    Scaffold(
        bottomBar = {
            NavigationBar(
                containerColor = MaterialTheme.colorScheme.surface
            ) {
                tabs.forEach { tab ->
                    val selected = currentRoute == tab.screen.route ||
                            (currentRoute?.startsWith(tab.screen.route) == true && 
                             tab.screen.route != Screen.Home.route)

                    NavigationBarItem(
                        icon = { 
                            Icon(
                                imageVector = tab.icon, 
                                contentDescription = tab.title + " Tab"
                            ) 
                        },
                        label = { Text(tab.title) },
                        selected = selected,
                        onClick = { 
                            if (!selected) {
                                navController.navigateSingleTop(tab.screen.route)
                            }
                        },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = MaterialTheme.colorScheme.onPrimary,
                            selectedTextColor = MaterialTheme.colorScheme.onPrimary,
                            indicatorColor = MaterialTheme.colorScheme.primary,
                            unselectedIconColor = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
                            unselectedTextColor = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                        )
                    )
                }
            }
        }
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = Screen.Home.route,
            modifier = Modifier.padding(innerPadding)
        ) {
            // Home screen
            composable(Screen.Home.route) {
                HomeScreen(
                    onVenueClick = { venue: Venue ->
                        navController.navigateSingleTop(Screen.VenueDetail(venue.id).route)
                    },
                    onBandClick = { band: Band ->
                        navController.navigateSingleTop(Screen.BandDetail(band.id).route)
                    },
                    onUserClick = {
                        navController.navigateSingleTop(Screen.Profile.route)
                    },
                    onNotificationClick = { /* Open notifications */ }
                )
            }

            // Venues screen
            composable(Screen.Venues.route) {
                VenuesScreen(
                    onVenueClick = { venue ->
                        navController.navigateSingleTop(Screen.VenueDetail(venue.id).route)
                    },
                    onBackClick = { navController.popBackStack() }
                )
            }

            // Venue detail screen
            composable(
                route = Screen.VenueDetail.route,
                arguments = listOf(
                    navArgument(Screen.VenueDetail.venueIdArg) {
                        type = NavType.StringType
                        nullable = false
                    }
                )
            ) { backStackEntry ->
                val venueId = navController.getStringArgument(Screen.VenueDetail.venueIdArg)
                VenueDetailScreen(
                    venueId = venueId,
                    onBackClick = { navController.popBackStack() }
                )
            }

            // Bands screen
            composable(Screen.Bands.route) {
                BandsScreen(
                    onBandClick = { band ->
                        navController.navigateSingleTop(Screen.BandDetail(band.id).route)
                    },
                    onBackClick = { navController.popBackStack() }
                )
            }

            // Band detail screen
            composable(
                route = Screen.BandDetail.route,
                arguments = listOf(
                    navArgument(Screen.BandDetail.bandIdArg) {
                        type = NavType.StringType
                        nullable = false
                    }
                )
            ) { backStackEntry ->
                val bandId = navController.getStringArgument(Screen.BandDetail.bandIdArg)
                BandDetailScreen(
                    bandId = bandId,
                    onBackClick = { navController.popBackStack() }
                )
            }

            // Profile screen
            composable(Screen.Profile.route) {
                ProfileScreen(
                    onBackClick = { navController.popBackStack() }
                )
            }

            // Badges screen
            composable(Screen.Badges.route) {
                BadgesScreen(
                    onBackClick = { navController.popBackStack() }
                )
            }
        }
    }
}

/**
 * Data class representing a navigation tab item.
 */
data class TabItem(
    val screen: Screen,
    val icon: ImageVector,
    val title: String
)

@Preview(showBackground = true)
@Composable
fun PitPulseAppPreview() {
    PitPulseAndroidTheme {
        PitPulseApp()
    }
}
