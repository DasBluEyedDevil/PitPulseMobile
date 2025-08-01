package com.example.pitpulseandroid.data.model

/**
 * Data class representing a music band or artist
 */
data class Band(
    val id: String,
    val name: String,
    val genre: String,
    val bio: String,
    val imageUrl: String,
    val formationYear: Int,
    val location: String,
    val rating: Float = 0f,
    val reviewCount: Int = 0,
    val genres: List<String> = listOf(),
    val nextShow: String = "",
    val members: List<BandMember> = emptyList(),
    val upcomingEvents: List<Event> = emptyList()
)

/**
 * Data class representing a band member
 */
data class BandMember(
    val id: String,
    val name: String,
    val role: String,
    val imageUrl: String = ""
)
