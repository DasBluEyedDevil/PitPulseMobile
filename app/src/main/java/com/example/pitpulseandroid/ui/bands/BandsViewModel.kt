package com.example.pitpulseandroid.ui.bands

import androidx.lifecycle.ViewModel
import com.example.pitpulseandroid.data.model.Band
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

class BandsViewModel : ViewModel() {
    private val _searchQuery = MutableStateFlow("")
    val searchQuery: StateFlow<String> = _searchQuery.asStateFlow()

    // Mock data for bands
    private val allBands = listOf(
        Band(
            id = "b1",
            name = "Electric Harmony",
            image = "https://picsum.photos/id/1038/500/300",
            rating = 4.7,
            reviewCount = 156,
            genres = listOf("Rock", "Alternative", "Indie"),
            nextShow = "Tonight at The Sound Garden"
        ),
        Band(
            id = "b2",
            name = "Midnight Groove",
            image = "https://picsum.photos/id/1039/500/300",
            rating = 4.3,
            reviewCount = 98,
            genres = listOf("R&B", "Soul", "Funk"),
            nextShow = "Tomorrow at Electric Avenue"
        ),
        Band(
            id = "b3",
            name = "Cosmic Travelers",
            image = "https://picsum.photos/id/1040/500/300",
            rating = 4.9,
            reviewCount = 230,
            genres = listOf("Psychedelic", "Space Rock", "Experimental"),
            nextShow = "Saturday at The Basement"
        ),
        Band(
            id = "b4",
            name = "Urban Pulse",
            image = "https://picsum.photos/id/1043/500/300",
            rating = 4.5,
            reviewCount = 120,
            genres = listOf("Hip Hop", "Rap", "Urban"),
            nextShow = "Friday at Electric Avenue"
        ),
        Band(
            id = "b5",
            name = "Velvet Sound",
            image = "https://picsum.photos/id/1044/500/300",
            rating = 4.6,
            reviewCount = 175,
            genres = listOf("Jazz", "Blues", "Swing"),
            nextShow = "Sunday at Harmony Hall"
        )
    )

    private val _bands = MutableStateFlow(allBands)
    val bands: StateFlow<List<Band>> = _bands.asStateFlow()

    fun onSearchQueryChange(query: String) {
        _searchQuery.value = query

        // Filter bands based on search query
        if (query.isBlank()) {
            _bands.value = allBands
        } else {
            _bands.value = allBands.filter { band ->
                band.name.contains(query, ignoreCase = true) ||
                band.genres.any { it.contains(query, ignoreCase = true) }
            }
        }
    }
}
