package com.example.pitpulseandroid.data.model

/**
 * Data class representing a badge that users can earn
 */
data class Badge(
    val id: String,
    val name: String,
    val description: String,
    val imageUrl: String,
    val icon: Int,  // Resource ID for the icon
    val badgeType: BadgeType,
    val threshold: Int,  // Threshold to achieve this badge
    val dateEarned: String? = null
)

/**
 * Enum representing different types of badges
 */
enum class BadgeType {
    REVIEW,
    VENUE_VISIT,
    SPECIAL_EVENT
    // Removed unused badge types
}
