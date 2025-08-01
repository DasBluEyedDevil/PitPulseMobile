package com.example.pitpulseandroid.ui.profile

import androidx.lifecycle.ViewModel
import com.example.pitpulseandroid.data.model.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

/**
 * ViewModel for the Profile screen.
 * This is used in the Profile screen to display user profile information.
 */
@Suppress("unused")
class ProfileViewModel : ViewModel() {
    // Mock data for user profile
    private val _userProfile = MutableStateFlow(
        UserProfile(
            user = User(
                id = "u1",
                username = "alexjmusic",
                email = "alex.j@example.com",
                level = 4,
                reviewCount = 42,
                badgeCount = 8,
                badges = listOf(
                    Badge(
                        id = "badge1",
                        name = "Review Pro",
                        description = "Posted 25+ reviews",
                        imageUrl = "",
                        icon = 0,
                        badgeType = BadgeType.REVIEW,
                        threshold = 25
                    ),
                    Badge(
                        id = "badge2",
                        name = "Venue Explorer",
                        description = "Visited 10+ venues",
                        imageUrl = "",
                        icon = 0,
                        badgeType = BadgeType.VENUE_VISIT,
                        threshold = 10
                    )
                ),
                profileImageUrl = "https://picsum.photos/id/1012/300/300",
                bio = "Music enthusiast and concert-goer. Always on the lookout for new sounds and experiences. Based in Brooklyn, NY.",
                joinDate = "January 2023"
            ),
            favoriteVenues = listOf("venue1", "venue2"),
            favoriteBands = listOf("band1", "band3"),
            recentActivity = listOf(
                UserActivity(
                    id = "activity1",
                    type = ActivityType.REVIEW_ADDED,
                    timestamp = "2023-08-15",
                    details = "Reviewed The Sound Garden",
                    relatedEntityId = "venue1"
                ),
                UserActivity(
                    id = "activity2",
                    type = ActivityType.BADGE_EARNED,
                    timestamp = "2023-07-28",
                    details = "Earned the Review Pro badge",
                    relatedEntityId = "badge1"
                )
            )
        )
    )

    /**
     * Public accessor for the user profile.
     * This is observed by the Profile screen to display user information.
     */
    @Suppress("unused")
    val userProfile: StateFlow<UserProfile> = _userProfile
}
