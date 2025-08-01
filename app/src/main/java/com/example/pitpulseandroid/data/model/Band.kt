package com.example.pitpulseandroid.data.model

import java.util.UUID

/**
 * Data class representing a band in the application.
 */
data class Band(
    val id: String = UUID.randomUUID().toString(),
    val name: String,
    val genre: String,
    val bio: String,
    val imageUrl: String,
    val formationYear: Int,
    val location: String,
    val socialLinks: Map<String, String> = mapOf(),
    val upcomingShows: List<String> = listOf()
) {
    companion object {
        // Sample data for UI development and testing
        fun getSampleBands(): List<Band> = listOf(
            Band(
                id = "band1",
                name = "Electric Harmony",
                genre = "Alternative Rock",
                bio = "Electric Harmony is a four-piece band known for their energetic performances and melodic hooks.",
                imageUrl = "https://example.com/electric_harmony.jpg",
                formationYear = 2018,
                location = "Austin, TX"
            ),
            Band(
                id = "band2",
                name = "Sonic Wave",
                genre = "Indie Pop",
                bio = "Sonic Wave blends catchy pop melodies with introspective lyrics for a unique sound.",
                imageUrl = "https://example.com/sonic_wave.jpg",
                formationYear = 2019,
                location = "Portland, OR"
            ),
            Band(
                id = "band3",
                name = "Midnight Rhythm",
                genre = "Jazz Fusion",
                bio = "Midnight Rhythm pushes the boundaries of jazz with elements of funk and electronic music.",
                imageUrl = "https://example.com/midnight_rhythm.jpg",
                formationYear = 2015,
                location = "New Orleans, LA"
            )
        )
    }
}
