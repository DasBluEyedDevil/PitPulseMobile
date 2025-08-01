package com.example.pitpulseandroid.util

import androidx.navigation.NavController
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavOptionsBuilder
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/**
 * Utility functions for navigation.
 */
object NavigationUtils {
    private var lastNavigationTime = 0L
    private var navigationJob: Job? = null
    private const val NAVIGATION_DEBOUNCE_TIME = 300L

    /**
     * Navigate to a destination with single top behavior and debouncing to prevent rapid navigation.
     * 
     * @param route The route to navigate to
     * @param popUpToRoute The route to pop up to, default is null
     * @param inclusive Whether to include the route in pop up to, default is false
     */
    fun NavController.navigateSingleTopWithOptions(route: String, popUpToRoute: String? = null, inclusive: Boolean = false) {
        val currentTime = System.currentTimeMillis()

        // Prevent rapid multiple navigations
        if (currentTime - lastNavigationTime < NAVIGATION_DEBOUNCE_TIME) {
            return
        }
        
        lastNavigationTime = currentTime

        // Cancel any pending navigation
        navigationJob?.cancel()

        // Start a new navigation job
        navigationJob = CoroutineScope(Dispatchers.Main).launch {
            delay(50) // Small delay to ensure UI stability
            navigate(route) {
                if (popUpToRoute != null) {
                    popUpTo(popUpToRoute) { this.inclusive = inclusive }
                } else {
                    // Pop up to start destination by default for main tab navigation
                    popUpTo(graph.findStartDestination().id) { this.inclusive = false }
                }
                launchSingleTop = true
                restoreState = true
            }
        }
    }

    /**
     * Navigate to a route with singleTop behavior to avoid stacking multiple instances of the same destination.
     */
    @Suppress("unused") // Kept for compatibility
    fun NavController.navigateSingleTop(route: String) {
        this.navigate(route) {
            // Pop up to the start destination of the graph to avoid building up a large stack of destinations
            popUpTo(this@navigateSingleTop.graph.startDestinationId) {
                saveState = true
            }
            // Avoid multiple copies of the same destination when reselecting the same item
            launchSingleTop = true
            // Restore state when reselecting a previously selected item
            restoreState = true
        }
    }

    /**
     * Safely retrieve a string argument from navigation back stack entry.
     * 
     * @param key The argument key
     * @param defaultValue The default value if argument is null
     * @return The argument value or default value
     */
    @Suppress("unused") // Kept for compatibility
    fun NavController.getStringArgument(key: String, defaultValue: String = ""): String {
        return currentBackStackEntry?.arguments?.getString(key) ?: defaultValue
    }

    /**
     * Get a string argument from navigation back stack entry
     */
    @Suppress("unused") // Kept for compatibility
    fun NavController.getStringArgument(key: String): String {
        return this.currentBackStackEntry?.arguments?.getString(key) ?: ""
    }

    /**
     * Check if current route is equal to given route.
     * 
     * @param route The route to check
     * @return True if current destination route equals given route
     */
    @Suppress("unused") // Will be used in future for route-based UI updates
    fun NavController.isCurrentRoute(route: String): Boolean {
        return currentDestination?.route == route
    }
}