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
    val upcomingEvents: List<Event> = emptyList()
)
