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
         *
         * Source mirrored from backend/database-schema.sql default badges:
         * - First Review (review_count, 1)
         * - Review Master (review_count, 10)
         * - Review Legend (review_count, 50)
         * - Venue Explorer (venue_explorer, 5)
         * - Music Lover (music_lover, 10)
         * - Concert Goer (event_attendance, 25)
         * - Helpful Reviewer (helpful_count, 20)
         *
         * Mapped backend types -> Android BadgeType for now:
         * - review_count, helpful_count -> REVIEW
         * - venue_explorer -> VENUE_VISIT
         * - music_lover -> REVIEW (reviews of different bands)
         * - event_attendance -> SPECIAL_EVENT
         */
        fun getSampleBadges(): List<Badge> {
            return listOf(
                Badge(
                    id = "first_review",
                    name = "First Review",
                    description = "Write your first review",
                    imageUrl = "",
                    icon = android.R.drawable.ic_menu_edit,
                    badgeType = BadgeType.REVIEW,
                    threshold = 1
                ),
                Badge(
                    id = "review_master",
                    name = "Review Master",
                    description = "Write 10 reviews",
                    imageUrl = "",
                    icon = android.R.drawable.ic_menu_edit,
                    badgeType = BadgeType.REVIEW,
                    threshold = 10
                ),
                Badge(
                    id = "review_legend",
                    name = "Review Legend",
                    description = "Write 50 reviews",
                    imageUrl = "",
                    icon = android.R.drawable.ic_menu_edit,
                    badgeType = BadgeType.REVIEW,
                    threshold = 50
                ),
                Badge(
                    id = "venue_explorer",
                    name = "Venue Explorer",
                    description = "Review 5 different venues",
                    imageUrl = "",
                    icon = android.R.drawable.ic_menu_compass,
                    badgeType = BadgeType.VENUE_VISIT,
                    threshold = 5
                ),
                Badge(
                    id = "music_lover",
                    name = "Music Lover",
                    description = "Review 10 different bands",
                    imageUrl = "",
                    icon = android.R.drawable.ic_media_play,
                    badgeType = BadgeType.REVIEW,
                    threshold = 10
                ),
                Badge(
                    id = "concert_goer",
                    name = "Concert Goer",
                    description = "Attend and review 25 events",
                    imageUrl = "",
                    icon = android.R.drawable.ic_menu_my_calendar,
                    badgeType = BadgeType.SPECIAL_EVENT,
                    threshold = 25
                ),
                Badge(
                    id = "helpful_reviewer",
                    name = "Helpful Reviewer",
                    description = "Get 20 helpful votes on reviews",
                    imageUrl = "",
                    icon = android.R.drawable.ic_menu_agenda,
                    badgeType = BadgeType.REVIEW,
                    threshold = 20
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
