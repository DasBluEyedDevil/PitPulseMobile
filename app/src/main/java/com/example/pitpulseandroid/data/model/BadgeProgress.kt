package com.example.pitpulseandroid.data.model

/**
 * Data class representing a user's progress towards earning a badge
 */
data class BadgeProgress(
    val badge: Badge,
    val currentValue: Int,
    val isEarned: Boolean = currentValue >= badge.threshold,
    val percentComplete: Float = (currentValue.toFloat() / badge.threshold).coerceAtMost(1f) * 100f,
    val tier: String = calculateTier(percentComplete, isEarned)
) {
    companion object {
        /**
         * Calculate badge tier based on completion percentage
         */
        private fun calculateTier(percent: Float, earned: Boolean): String {
            return when {
                earned -> "Gold"
                percent >= 66 -> "Silver"
                percent >= 33 -> "Bronze"
                else -> "None"
            }
        }

        /**
         * Creates a list of sample badge progress objects for testing
         */
        @Suppress("unused")
        fun getSampleBadgeProgress(): List<BadgeProgress> {
            return Badge.getSampleBadges().mapIndexed { index, badge ->
                // Create varied progress for each badge
                val progress = when (index % 3) {
                    0 -> badge.threshold // Completed
                    1 -> (badge.threshold * 0.7).toInt() // In progress
                    else -> (badge.threshold * 0.2).toInt() // Just started
                }
                BadgeProgress(
                    badge = badge,
                    currentValue = progress
                )
            }
        }
    }
}
