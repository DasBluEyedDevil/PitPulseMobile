package com.example.pitpulseandroid.data.model

/**
 * Data class representing a user profile with extended information
 */
data class UserProfile(
    val user: User,
    val favoriteVenues: List<String> = emptyList(),
    val favoriteBands: List<String> = emptyList(),
    val recentActivity: List<UserActivity> = emptyList(),
    val preferences: UserPreferences = UserPreferences()
)

/**
 * Data class for user activity
 */
data class UserActivity(
    val id: String,
    val type: ActivityType,
    val timestamp: String,
    val details: String,
    val relatedEntityId: String? = null
)

/**
 * Enum for different types of user activities
 */
enum class ActivityType {
    REVIEW_ADDED,
    BADGE_EARNED
    // Removed unused activity types
}

/**
 * Data class for user preferences
 */
data class UserPreferences(
    val notificationsEnabled: Boolean = true,
    val darkModeEnabled: Boolean = false,
    val privacySettings: PrivacySettings = PrivacySettings()
)

/**
 * Data class for privacy settings
 */
data class PrivacySettings(
    val profileVisibility: ProfileVisibility = ProfileVisibility.PUBLIC,
    val showRecentActivity: Boolean = true,
    val showFollowers: Boolean = true
)

/**
 * Enum for profile visibility options
 */
enum class ProfileVisibility {
    PUBLIC
    // Removed unused visibility options
}
