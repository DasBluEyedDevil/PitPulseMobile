package com.example.pitpulseandroid.ui.components

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.tooling.preview.Preview
import com.example.pitpulseandroid.ui.theme.PitPulseAndroidTheme

/**
 * Data class representing a navigation item in the bottom navigation bar.
 */
data class NavigationItem(
    val title: String,
    val icon: ImageVector,
    val route: String
)

/**
 * Bottom navigation bar component for the app.
 * 
 * @param selectedRoute The currently selected route
 * @param onRouteSelected Callback when a route is selected
 * @param modifier Modifier to be applied to the navigation bar
 */
@Composable
fun BottomNavigationBar(
    selectedRoute: String,
    onRouteSelected: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    // Define navigation items
    val navigationItems = listOf(
        NavigationItem(
            title = "Home",
            icon = Icons.Default.Home,
            route = "home"
        ),
        NavigationItem(
            title = "Venues",
            icon = Icons.Default.LocationOn,
            route = "venues"
        ),
        NavigationItem(
            title = "Bands",
            icon = Icons.Default.Star,
            route = "bands"
        ),
        NavigationItem(
            title = "Profile",
            icon = Icons.Default.Person,
            route = "profile"
        )
    )

    NavigationBar(
        modifier = modifier
    ) {
        navigationItems.forEach { item ->
            NavigationBarItem(
                icon = { Icon(item.icon, contentDescription = item.title) },
                label = { Text(item.title) },
                selected = selectedRoute == item.route,
                onClick = { onRouteSelected(item.route) }
            )
        }
    }
}

@Preview
@Composable
fun BottomNavigationBarPreview() {
    var selectedRoute by remember { mutableStateOf("home") }

    PitPulseAndroidTheme {
        BottomNavigationBar(
            selectedRoute = selectedRoute,
            onRouteSelected = { selectedRoute = it }
        )
    }
}
