package com.example.pitpulseandroid.data.model

/**
 * Data class representing an event (concert, show, etc.)
 */
data class Event(
    val id: String,
    val name: String,
    val description: String,
    val venueId: String,
    val venueName: String,
    val date: String,
    val time: String,
    val imageUrl: String = "",
    val bandIds: List<String> = emptyList(),
    val bandNames: List<String> = emptyList(),
    val ticketPrice: Double = 0.0,
    val ticketUrl: String = "",
    val isSoldOut: Boolean = false
)
