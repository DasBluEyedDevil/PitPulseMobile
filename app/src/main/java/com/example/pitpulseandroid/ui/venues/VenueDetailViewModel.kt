package com.example.pitpulseandroid.ui.venues

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import com.example.pitpulseandroid.data.model.Venue
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

class VenueDetailViewModel(private val venueId: String) : ViewModel() {
    // Mock data for venue details
    private val venuesMap = mapOf(
        "v1" to Venue(
            id = "v1",
            name = "The Sound Garden",
            image = "https://picsum.photos/id/1035/1000/600",
            rating = 4.5,
            reviewCount = 120,
            address = "123 Main St, Brooklyn, NY",
            distance = "0.8 mi",
            amenities = listOf("Live Music", "Full Bar", "Food", "Outdoor Seating", "Private Events"),
            description = "The Sound Garden is a premier live music venue featuring a mix of local and national acts. With a state-of-the-art sound system and intimate setting, it's the perfect place to experience your favorite artists up close. The venue also offers a full menu and craft cocktails.",
            upcomingEvents = listOf(
                "Electric Harmony - Tonight at 9PM",
                "Midnight Groove - Tomorrow at 8PM",
                "Acoustic Sessions - Sunday at 7PM"
            )
        ),
        "v2" to Venue(
            id = "v2",
            name = "Electric Avenue",
            image = "https://picsum.photos/id/1036/1000/600",
            rating = 4.2,
            reviewCount = 85,
            address = "456 Park Ave, Brooklyn, NY",
            distance = "1.2 mi",
            amenities = listOf("DJ Booth", "Dance Floor", "Cocktails", "VIP Tables", "Late Night"),
            description = "Electric Avenue is Brooklyn's hottest nightclub, featuring world-class DJs and an incredible atmosphere. The venue boasts a state-of-the-art sound system, elaborate light shows, and a spacious dance floor. Perfect for a night out with friends.",
            upcomingEvents = listOf(
                "DJ Pulse - Saturday at 10PM",
                "Neon Nights - Friday at 11PM"
            )
        ),
        "v3" to Venue(
            id = "v3",
            name = "The Basement",
            image = "https://picsum.photos/id/1037/1000/600",
            rating = 4.8,
            reviewCount = 210,
            address = "789 Broadway, Brooklyn, NY",
            distance = "1.5 mi",
            amenities = listOf("Underground", "Indie Bands", "Craft Beer", "Vinyl DJ", "Art Exhibitions"),
            description = "The Basement is a unique underground venue known for showcasing emerging indie talent and experimental music. The intimate setting and excellent acoustics make it a favorite among music enthusiasts. They also offer an impressive selection of craft beers and host regular art exhibitions.",
            upcomingEvents = listOf(
                "Cosmic Travelers - Saturday at 9PM",
                "Underground Collective - Sunday at 8PM",
                "Indie Showcase - Wednesday at 8PM"
            )
        ),
        "v4" to Venue(
            id = "v4",
            name = "Harmony Hall",
            image = "https://picsum.photos/id/1041/1000/600",
            rating = 4.4,
            reviewCount = 112,
            address = "234 Fifth Ave, Brooklyn, NY",
            distance = "2.1 mi",
            amenities = listOf("Acoustic", "Intimate", "Wine Bar", "Jazz", "Poetry Nights"),
            description = "Harmony Hall is an intimate venue perfect for acoustic performances and jazz nights. The cozy atmosphere and excellent acoustics create an immersive listening experience. They offer an extensive wine selection and host regular poetry readings and spoken word events.",
            upcomingEvents = listOf(
                "Jazz Quartet - Friday at 8PM",
                "Acoustic Sessions - Sunday at 7PM"
            )
        ),
        "v5" to Venue(
            id = "v5",
            name = "The Echo Chamber",
            image = "https://picsum.photos/id/1042/1000/600",
            rating = 4.6,
            reviewCount = 189,
            address = "567 Sixth St, Brooklyn, NY",
            distance = "1.7 mi",
            amenities = listOf("Electronic", "Light Show", "Late Night", "Art Installations", "Multi-Level"),
            description = "The Echo Chamber is a cutting-edge venue specializing in electronic music and immersive experiences. The space features multiple levels, each with its own unique atmosphere and sound. Known for spectacular light shows and interactive art installations, it's a multisensory experience unlike any other in Brooklyn.",
            upcomingEvents = listOf(
                "Electronic Showcase - Saturday at 10PM",
                "Visual Audio Experience - Friday at 11PM",
                "Beat Collective - Thursday at 9PM"
            )
        )
    )

    private val _venue = MutableStateFlow<Venue?>(venuesMap[venueId])
    val venue: StateFlow<Venue?> = _venue

    class Factory(private val venueId: String) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T {
            if (modelClass.isAssignableFrom(VenueDetailViewModel::class.java)) {
                return VenueDetailViewModel(venueId) as T
            }
            throw IllegalArgumentException("Unknown ViewModel class")
        }
    }
}
