package com.example.pitpulseandroid.data.model

import java.time.LocalDateTime

/**
 * Types of badges that can be earned in the app
 */
enum class BadgeType {
    REVIEW_COUNT,     // Based on number of reviews written
    VENUE_EXPLORER,   // Based on unique venues visited
    MUSIC_LOVER,      // Based on number of different bands seen
    @Suppress("unused") EVENT_ATTENDANCE, // Based on total events attended
    @Suppress("unused") HELPFUL_COUNT     // Based on "helpful" marks received on reviews
}

/**
 * Data class representing a badge in the application.
 */
data class Badge(
    val id: String,
    val name: String,
    val description: String,
    val imageUrl: String,
    val badgeType: BadgeType,
    val threshold: Int,
    val tier: Int = 1
) {
    companion object {
        // Sample data for UI development and testing
        fun getSampleBadges(): List<Badge> = listOf(
            Badge(
                id = "review_bronze",
                name = "Critic Beginner",
                description = "Write 5 reviews",
                imageUrl = "https://example.com/badges/review_bronze.png",
                badgeType = BadgeType.REVIEW_COUNT,
                threshold = 5,
                tier = 1
            ),
            Badge(
                id = "review_silver",
                name = "Critic Enthusiast",
                description = "Write 25 reviews",
                imageUrl = "https://example.com/badges/review_silver.png",
                badgeType = BadgeType.REVIEW_COUNT,
                threshold = 25,
                tier = 2
            ),
            Badge(
                id = "review_gold",
                name = "Master Critic",
                description = "Write 100 reviews",
                imageUrl = "https://example.com/badges/review_gold.png",
                badgeType = BadgeType.REVIEW_COUNT,
                threshold = 100,
                tier = 3
            ),
            Badge(
                id = "venue_bronze",
                name = "Venue Explorer",
                description = "Visit 3 different venues",
                imageUrl = "https://example.com/badges/venue_bronze.png",
                badgeType = BadgeType.VENUE_EXPLORER,
                threshold = 3,
                tier = 1
            ),
            Badge(
                id = "venue_silver",
                name = "Venue Enthusiast",
                description = "Visit 10 different venues",
                imageUrl = "https://example.com/badges/venue_silver.png",
                badgeType = BadgeType.VENUE_EXPLORER,
                threshold = 10,
                tier = 2
            ),
            Badge(
                id = "venue_gold",
                name = "Venue Aficionado",
                description = "Visit 25 different venues",
                imageUrl = "https://example.com/badges/venue_gold.png",
                badgeType = BadgeType.VENUE_EXPLORER,
                threshold = 25,
                tier = 3
            ),
            Badge(
                id = "band_bronze",
                name = "Music Fan",
                description = "See 5 different bands",
                imageUrl = "https://example.com/badges/band_bronze.png",
                badgeType = BadgeType.MUSIC_LOVER,
                threshold = 5,
                tier = 1
            ),
            Badge(
                id = "band_silver",
                name = "Music Enthusiast",
                description = "See 15 different bands",
                imageUrl = "https://example.com/badges/band_silver.png",
                badgeType = BadgeType.MUSIC_LOVER,
                threshold = 15,
                tier = 2
            ),
            Badge(
                id = "band_gold",
                name = "Music Aficionado",
                description = "See 30 different bands",
                imageUrl = "https://example.com/badges/band_gold.png",
                badgeType = BadgeType.MUSIC_LOVER,
                threshold = 30,
                tier = 3
            )
        )
    }
}

/**
 * Data class representing a badge earned by a user.
 */
@Suppress("unused") // Will be used when connecting to backend
data class UserBadge(
    val id: String,
    val userId: String,
    val badgeId: String,
    val dateEarned: LocalDateTime,
    val badge: Badge? = null,
    val currentProgress: Int = 0
)

/**
 * Data class representing a user's progress toward earning a badge.
 */
data class BadgeProgress(
    val badge: Badge,
    val currentValue: Int,
    val isEarned: Boolean,
    val percentComplete: Float = (currentValue.toFloat() / badge.threshold) * 100f
)
