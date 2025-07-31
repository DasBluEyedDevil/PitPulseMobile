package com.example.pitpulseandroid.data.model

/**
 * Data class representing a music venue.
 */
data class Venue(
    val id: String,
    val name: String,
    val image: String, // URL or local drawable resource name
    val rating: Double,
    val reviewCount: Int,
    val address: String,
    val distance: String,
    val amenities: List<String>,
    val description: String? = null,
    val upcomingEvents: List<String> = emptyList(),
    val ratings: Map<String, Double> = emptyMap() // Category name to rating value
)
