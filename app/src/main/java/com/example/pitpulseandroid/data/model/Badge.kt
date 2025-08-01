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
) {
    companion object {
        /**
         * Returns a list of sample badges for development and testing
         */
        fun getSampleBadges(): List<Badge> {
            return listOf(
                Badge(
                    id = "badge1",
                    name = "Venue Explorer",
                    description = "Visit 5 different venues",
                    imageUrl = "",
                    icon = android.R.drawable.ic_menu_compass,
                    badgeType = BadgeType.VENUE_VISIT,
                    threshold = 5
                ),
                Badge(
                    id = "badge2",
                    name = "Review Master",
                    description = "Write 10 reviews",
                    imageUrl = "",
                    icon = android.R.drawable.ic_menu_edit,
                    badgeType = BadgeType.REVIEW,
                    threshold = 10
                ),
                Badge(
                    id = "badge3",
                    name = "Feedback Pro",
                    description = "Receive 15 helpful votes on your reviews",
                    imageUrl = "",
                    icon = android.R.drawable.ic_menu_send,
                    badgeType = BadgeType.REVIEW,
                    threshold = 15
                ),
                Badge(
                    id = "badge4",
                    name = "Night Owl",
                    description = "Attend 3 shows that started after 10pm",
                    imageUrl = "",
                    icon = android.R.drawable.ic_menu_recent_history,
                    badgeType = BadgeType.SPECIAL_EVENT,
                    threshold = 3
                ),
                Badge(
                    id = "badge5",
                    name = "Local Champion",
                    description = "Visit 8 venues in your city",
                    imageUrl = "",
                    icon = android.R.drawable.ic_menu_myplaces,
                    badgeType = BadgeType.VENUE_VISIT,
                    threshold = 8
                )
            )
        }
    }
}

/**
 * Enum representing different types of badges
 */
enum class BadgeType {
    REVIEW,
    VENUE_VISIT,
    SPECIAL_EVENT
    // Removed unused badge types
}
