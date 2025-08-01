package com.example.pitpulseandroid.data.repository

import com.example.pitpulseandroid.data.model.*
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.flow

/**
 * Repository class that acts as a single source of truth for app data
 */
class Repository {

    // Mock data for development
    private val _currentUser = MutableStateFlow<User?>(null)
    private val _venues = MutableStateFlow<List<Venue>>(emptyList())
    private val _bands = MutableStateFlow<List<Band>>(emptyList())

    // Public accessors
    val venues = _venues.asStateFlow()
    val bands = _bands.asStateFlow()

    /**
     * Get a list of venues
     */
    fun getVenues(): Flow<List<Venue>> {
        // In a real app, this would call an API or database
        return flow { emit(_venues.value) }
    }

    /**
     * Get a list of bands
     */
    fun getBands(): Flow<List<Band>> {
        // In a real app, this would call an API or database
        return flow { emit(_bands.value) }
    }

    /**
     * Get the current logged-in user
     */
    fun getCurrentUser(): Flow<User> {
        // In a real app, this would get from local storage or API
        return flow {
            _currentUser.value?.let {
                emit(it)
            } ?: throw Exception("User not logged in")
        }
    }

    /**
     * Search for venues by name or location
     */
    fun searchVenues(query: String): Flow<List<Venue>> {
        val filteredVenues = _venues.value.filter {
            it.name.contains(query, ignoreCase = true) ||
            it.city.contains(query, ignoreCase = true) ||
            it.state.contains(query, ignoreCase = true)
        }
        return flow { emit(filteredVenues) }
    }

    /**
     * Search for bands by name or genre
     */
    fun searchBands(query: String): Flow<List<Band>> {
        val filteredBands = _bands.value.filter {
            it.name.contains(query, ignoreCase = true) ||
            it.genre.contains(query, ignoreCase = true)
        }
        return flow { emit(filteredBands) }
    }

    /**
     * Initialize repository with mock data for development
     */
    fun initMockData() {
        // Initialize mock user
        _currentUser.value = User(
            id = "user1",
            username = "rockfan89",
            email = "user@example.com",
            level = 3,
            reviewCount = 15,
            badgeCount = 4,
            badges = listOf(
                Badge(
                    id = "badge1",
                    name = "Venue Explorer",
                    description = "Visited 5 different venues",
                    imageUrl = "",
                    icon = 0, // Replace with actual resource ID
                    badgeType = BadgeType.VENUE_VISIT,
                    threshold = 5
                ),
                Badge(
                    id = "badge2",
                    name = "Review Master",
                    description = "Wrote 10 reviews",
                    imageUrl = "",
                    icon = 0, // Replace with actual resource ID
                    badgeType = BadgeType.REVIEW,
                    threshold = 10
                )
            )
        )

        // Initialize mock venues
        _venues.value = listOf(
            Venue(
                id = "venue1",
                name = "The Sound Garden",
                address = "123 Main St",
                city = "Seattle",
                state = "WA",
                zipCode = "98101",
                description = "A legendary venue known for launching the careers of many famous grunge bands",
                imageUrl = "",
                rating = 4.8f,
                reviewCount = 156,
                capacity = 500,
                contactInfo = "info@soundgarden.com",
                distance = 1.2f
            ),
            Venue(
                id = "venue2",
                name = "Electric Ballroom",
                address = "456 Oak Ave",
                city = "Portland",
                state = "OR",
                zipCode = "97205",
                description = "A vibrant venue showcasing up-and-coming indie artists",
                imageUrl = "",
                rating = 4.5f,
                reviewCount = 98,
                capacity = 350,
                contactInfo = "contact@electricballroom.com",
                distance = 3.5f
            ),
            Venue(
                id = "venue3",
                name = "Rhythm House",
                address = "789 Pine St",
                city = "San Francisco",
                state = "CA",
                zipCode = "94109",
                description = "An intimate setting perfect for acoustic performances",
                imageUrl = "",
                rating = 4.7f,
                reviewCount = 122,
                capacity = 200,
                contactInfo = "info@rhythmhouse.com",
                distance = 5.1f
            )
        )

        // Initialize mock bands
        _bands.value = listOf(
            Band(
                id = "band1",
                name = "Cosmic Drift",
                genre = "Indie Rock",
                bio = "A four-piece indie rock band known for their atmospheric sounds and introspective lyrics",
                imageUrl = "",
                formationYear = 2018,
                location = "Seattle, WA",
                rating = 4.6f,
                reviewCount = 87,
                genres = listOf("Indie Rock", "Alternative", "Shoegaze"),
                nextShow = "Aug 15 at The Sound Garden"
            ),
            Band(
                id = "band2",
                name = "Midnight Revival",
                genre = "Blues Rock",
                bio = "A power trio bringing classic blues rock into the modern era",
                imageUrl = "",
                formationYear = 2015,
                location = "Chicago, IL",
                rating = 4.8f,
                reviewCount = 134,
                genres = listOf("Blues Rock", "Classic Rock", "Southern Rock"),
                nextShow = "Aug 22 at Electric Ballroom"
            ),
            Band(
                id = "band3",
                name = "Synth Collective",
                genre = "Electronic",
                bio = "An experimental electronic group pushing the boundaries of synthesized music",
                imageUrl = "",
                formationYear = 2020,
                location = "Austin, TX",
                rating = 4.4f,
                reviewCount = 56,
                genres = listOf("Electronic", "Synth-pop", "Experimental"),
                nextShow = "Sep 5 at Rhythm House"
            )
        )
    }
}
