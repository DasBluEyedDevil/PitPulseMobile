package com.example.pitpulseandroid.navigation

/**
 * Sealed class representing all screens in the app.
 */
sealed class Screen(val route: String) {
    object Home : Screen("home")
    object Venues : Screen("venues")
    object Bands : Screen("bands")
    object Profile : Screen("profile")
    object Badges : Screen("badges")

    class VenueDetail(venueId: String) : Screen("venue/$venueId") {
        companion object {
            const val route = "venue/{venueId}"
            const val venueIdArg = "venueId"
        }
    }

    class BandDetail(bandId: String) : Screen("band/$bandId") {
        companion object {
            const val route = "band/{bandId}"
            const val bandIdArg = "bandId"
        }
    }
}
