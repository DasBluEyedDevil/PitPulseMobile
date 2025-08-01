package com.example.pitpulseandroid.data.model

/**
 * Data class representing a music venue
 */
data class Venue(
    val id: String,
    val name: String,
    val address: String,
    val city: String,
    val state: String,
    val zipCode: String,
    val description: String,
    val imageUrl: String,
    val rating: Float = 0f,
    val reviewCount: Int = 0,
    val capacity: Int,
    val contactInfo: String,
    val distance: Float = 0f,  // Distance from user's location
    val upcomingEvents: List<Event> = emptyList(),
    val amenities: List<String> = emptyList()  // List of venue amenities/features
) {
    companion object {
        /**
         * Returns a list of sample venues for development and testing
         */
        fun getSampleVenues(): List<Venue> {
            return listOf(
                Venue(
                    id = "v1",
                    name = "The Sound Garden",
                    address = "123 Main St",
                    city = "Brooklyn",
                    state = "NY",
                    zipCode = "11201",
                    description = "A legendary venue known for launching indie bands",
                    imageUrl = "https://picsum.photos/id/1035/500/300",
                    rating = 4.5f,
                    reviewCount = 120,
                    capacity = 500,
                    contactInfo = "info@soundgarden.com",
                    distance = 0.8f,
                    amenities = listOf("Live Music", "Full Bar", "Food Service", "Outdoor Seating")
                ),
                Venue(
                    id = "v2",
                    name = "Electric Avenue",
                    address = "456 Park Ave",
                    city = "Brooklyn",
                    state = "NY",
                    zipCode = "11205",
                    description = "Modern venue with great acoustics and lighting",
                    imageUrl = "https://picsum.photos/id/1036/500/300",
                    rating = 4.2f,
                    reviewCount = 85,
                    capacity = 350,
                    contactInfo = "contact@electricavenue.com",
                    distance = 1.2f,
                    amenities = listOf("DJ Booth", "Dance Floor", "Cocktail Bar", "VIP Area")
                ),
                Venue(
                    id = "v3",
                    name = "The Basement",
                    address = "789 Broadway",
                    city = "Brooklyn",
                    state = "NY",
                    zipCode = "11206",
                    description = "Underground venue featuring indie bands and craft beer",
                    imageUrl = "https://picsum.photos/id/1037/500/300",
                    rating = 4.8f,
                    reviewCount = 210,
                    capacity = 200,
                    contactInfo = "basement@music.com",
                    distance = 1.5f,
                    amenities = listOf("Indie Bands", "Craft Beer", "Intimate Setting", "Underground")
                )
            )
        }
    }
}
