package com.example.pitpulseandroid.data.model

import java.util.UUID

/**
 * Data class representing a venue in the application.
 */
data class Venue(
    val id: String = UUID.randomUUID().toString(),
    val name: String,
    val address: String,
    val city: String,
    val state: String,
    val zipCode: String,
    val description: String,
    val imageUrl: String,
    val capacity: Int,
    val contactInfo: String,
    val amenities: List<String> = listOf(),
    val upcomingEvents: List<String> = listOf()
) {
    companion object {
        // Sample data for UI development and testing
        fun getSampleVenues(): List<Venue> = listOf(
            Venue(
                id = "venue1",
                name = "The Soundstage",
                address = "123 Music Avenue",
                city = "Austin",
                state = "TX",
                zipCode = "78701",
                description = "A premier music venue featuring state-of-the-art sound systems and multiple performance spaces.",
                imageUrl = "https://example.com/soundstage.jpg",
                capacity = 1200,
                contactInfo = "info@soundstage.com",
                amenities = listOf("Full Bar", "VIP Seating", "Merchandise Shop")
            ),
            Venue(
                id = "venue2",
                name = "Echo Lounge",
                address = "456 Harmony Road",
                city = "Nashville",
                state = "TN",
                zipCode = "37203",
                description = "An intimate venue known for its perfect acoustics and showcasing emerging artists.",
                imageUrl = "https://example.com/echo_lounge.jpg",
                capacity = 350,
                contactInfo = "bookings@echolounge.com",
                amenities = listOf("Craft Beer Selection", "Outdoor Patio")
            ),
            Venue(
                id = "venue3",
                name = "Rhythm Hall",
                address = "789 Beat Street",
                city = "New Orleans",
                state = "LA",
                zipCode = "70116",
                description = "Historic venue featuring a wide range of musical genres from jazz to rock.",
                imageUrl = "https://example.com/rhythm_hall.jpg",
                capacity = 800,
                contactInfo = "events@rhythmhall.com",
                amenities = listOf("Full Restaurant", "Premium Sound System", "Accessible Facilities")
            )
        )
    }
}
