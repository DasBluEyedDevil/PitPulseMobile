package com.example.pitpulseandroid.ui.profile

import androidx.lifecycle.ViewModel
import com.example.pitpulseandroid.data.model.UserProfile
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

class ProfileViewModel : ViewModel() {
    // Mock data for user profile
    private val _userProfile = MutableStateFlow(
        UserProfile(
            id = "u1",
            name = "Alex Johnson",
            username = "@alexjmusic",
            profilePicture = "https://picsum.photos/id/1012/300/300",
            bio = "Music enthusiast and concert-goer. Always on the lookout for new sounds and experiences. Based in Brooklyn, NY.",
            favoriteGenres = listOf("Indie Rock", "Alternative", "Psychedelic", "Hip Hop", "Jazz"),
            reviewCount = 42,
            favoritesCount = 28,
            ticketsCount = 15
        )
    )
    val userProfile: StateFlow<UserProfile?> = _userProfile
}
