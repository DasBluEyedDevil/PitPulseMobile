package com.example.pitpulseandroid.data.model

import com.example.pitpulseandroid.data.model.Badge

/**
 * Data class representing a user profile.
 */
data class User(
    val username: String,
    val level: Int,
    val reviewCount: Int,
    val badgeCount: Int,
    val badges: List<Badge> = emptyList() // Optional list of badges earned by the user
)
