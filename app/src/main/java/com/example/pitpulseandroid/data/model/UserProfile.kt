package com.example.pitpulseandroid.data.model

/**
 * Data model representing a user profile.
 */
data class UserProfile(
    val id: String,
    val name: String,
    val username: String,
    val profilePicture: String,
    val bio: String? = null,
    val favoriteGenres: List<String> = emptyList(),
    val reviewCount: Int = 0,
    val favoritesCount: Int = 0,
    val ticketsCount: Int = 0
)
