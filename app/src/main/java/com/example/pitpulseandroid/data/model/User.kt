package com.example.pitpulseandroid.data.model

/**
 * Data class representing a user in the application
 */
data class User(
    val id: String,
    val username: String,
    val email: String,
    val level: Int,
    val reviewCount: Int,
    val badgeCount: Int,
    val badges: List<Badge> = emptyList(),
    val profileImageUrl: String = "",
    val bio: String = "",
    val joinDate: String = "",
    val followersCount: Int = 0,
    val followingCount: Int = 0
)
