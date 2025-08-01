package com.example.pitpulseandroid.ui.venues

import androidx.lifecycle.ViewModel
import com.example.pitpulseandroid.data.model.Venue
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

class VenuesViewModel : ViewModel() {
    private val _searchQuery = MutableStateFlow("")
    val searchQuery: StateFlow<String> = _searchQuery.asStateFlow()

    // Mock data for venues
    private val allVenues = listOf(
        Venue(
            id = "v1",
            name = "The Sound Garden",
            image = "https://picsum.photos/id/1035/500/300",
            rating = 4.5f,
            reviewCount = 120,
            address = "123 Main St, Brooklyn, NY",
            distance = "0.8 mi",
            amenities = listOf("Live Music", "Full Bar", "Food"),
            city = "Brooklyn",
            state = "NY",
            zipCode = "11201",
            description = "A legendary venue known for launching indie bands",
            capacity = 500,
            contactInfo = "info@soundgarden.com"
        ),
        Venue(
            id = "v2",
            name = "Electric Avenue",
            image = "https://picsum.photos/id/1036/500/300",
            rating = 4.2f,
            reviewCount = 85,
            address = "456 Park Ave, Brooklyn, NY",
            distance = "1.2 mi",
            amenities = listOf("DJ Booth", "Dance Floor", "Cocktails"),
            city = "Brooklyn",
            state = "NY",
            zipCode = "11205",
            description = "Modern venue with great acoustics and lighting",
            capacity = 350,
            contactInfo = "contact@electricavenue.com"
        ),
        Venue(
            id = "v3",
            name = "The Basement",
            image = "https://picsum.photos/id/1037/500/300",
            rating = 4.8f,
            reviewCount = 210,
            address = "789 Broadway, Brooklyn, NY",
            distance = "1.5 mi",
            amenities = listOf("Underground", "Indie Bands", "Craft Beer"),
            city = "Brooklyn",
            state = "NY",
            zipCode = "11206",
            description = "Underground venue featuring indie bands and craft beer",
            capacity = 200,
            contactInfo = "basement@music.com"
        ),
        Venue(
            id = "v4",
            name = "Harmony Hall",
            image = "https://picsum.photos/id/1041/500/300",
            rating = 4.4f,
            reviewCount = 112,
            address = "234 Fifth Ave, Brooklyn, NY",
            distance = "2.1 mi",
            amenities = listOf("Acoustic", "Intimate", "Wine Bar"),
            city = "Brooklyn",
            state = "NY",
            zipCode = "11205",
            description = "Harmony Hall is an intimate venue perfect for acoustic performances and jazz nights.",
            capacity = 150,
            contactInfo = "contact@harmonyhall.com"
        ),
        Venue(
            id = "v5",
            name = "The Echo Chamber",
            image = "https://picsum.photos/id/1042/500/300",
            rating = 4.6f,
            reviewCount = 189,
            address = "567 Sixth St, Brooklyn, NY",
            distance = "1.7 mi",
            amenities = listOf("Electronic", "Light Show", "Late Night"),
            city = "Brooklyn",
            state = "NY",
            zipCode = "11215",
            description = "The Echo Chamber is a cutting-edge venue specializing in electronic music and immersive experiences.",
            capacity = 400,
            contactInfo = "contact@echochamber.com"
        )
    )

    private val _venues = MutableStateFlow(allVenues)
    val venues: StateFlow<List<Venue>> = _venues.asStateFlow()

    fun onSearchQueryChange(query: String) {
        _searchQuery.value = query

        // Filter venues based on search query
        if (query.isBlank()) {
            _venues.value = allVenues
        } else {
            _venues.value = allVenues.filter { venue ->
                venue.name.contains(query, ignoreCase = true) ||
                venue.address.contains(query, ignoreCase = true) ||
                venue.amenities.any { it.contains(query, ignoreCase = true) }
            }
        }
    }
}
