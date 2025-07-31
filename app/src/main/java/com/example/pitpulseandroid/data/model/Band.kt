package com.example.pitpulseandroid.data.model

/**
 * Data class representing a music band.
 */
data class Band(
    val id: String,
    val name: String,
    val image: String, // URL or local drawable resource name
    val rating: Double,
    val reviewCount: Int,
    val genres: List<String> = emptyList(),
    val genre: String = "", // For backward compatibility
    val bio: String = "",
    val nextShow: String? = null,
    val upcomingShows: List<String> = emptyList(),
    val performanceRatings: Map<String, Double> = emptyMap() // Category name to rating value
)
