package com.example.pitpulseandroid.ui.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.pitpulseandroid.data.repository.Repository
import com.example.pitpulseandroid.data.model.Band
import com.example.pitpulseandroid.data.model.User
import com.example.pitpulseandroid.data.model.Venue
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.launch

/**
 * ViewModel for the Home screen.
 * This class is used by the Home screen to display venues, bands, and user information.
 */
@Suppress("unused")
class HomeViewModel(private val repository: Repository) : ViewModel() {

    // UI state for the Home screen
    private val _uiState = MutableStateFlow(HomeUiState())

    /**
     * Public accessor for the UI state.
     * This is observed by the Home screen to display content and handle loading/error states.
     */
    @Suppress("unused")
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    init {
        // Initialize repository with mock data
        repository.initMockData()
        loadData()
    }

    /**
     * Load all data needed for the Home screen.
     */
    private fun loadData() {
        viewModelScope.launch {
            // Load venues
            repository.getVenues()
                .catch {
                    _uiState.value = _uiState.value.copy(error = it.message)
                    // Load sample venues as fallback
                    _uiState.value = _uiState.value.copy(
                        venues = getSampleVenues(),
                        isLoading = false
                    )
                }
                .collect { venues ->
                    _uiState.value = _uiState.value.copy(
                        venues = venues,
                        isLoading = false
                    )
                }
        }

        viewModelScope.launch {
            // Load bands
            repository.getBands()
                .catch {
                    _uiState.value = _uiState.value.copy(error = it.message)
                    // Load sample bands as fallback
                    _uiState.value = _uiState.value.copy(
                        bands = getSampleBands(),
                        isLoading = false
                    )
                }
                .collect { bands ->
                    _uiState.value = _uiState.value.copy(
                        bands = bands,
                        isLoading = false
                    )
                }
        }

        viewModelScope.launch {
            // Load user
            repository.getCurrentUser()
                .catch { _uiState.value = _uiState.value.copy(error = it.message) }
                .collect { user ->
                    _uiState.value = _uiState.value.copy(
                        user = user,
                        isLoading = false
                    )
                }
        }
    }

    /**
     * Search venues and bands.
     */
    @Suppress("unused")
    fun search(query: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSearching = true)

            repository.searchVenues(query)
                .catch { _uiState.value = _uiState.value.copy(error = it.message) }
                .collect { venues ->
                    _uiState.value = _uiState.value.copy(
                        venues = venues,
                        isSearching = false
                    )
                }
        }

        viewModelScope.launch {
            repository.searchBands(query)
                .catch { _uiState.value = _uiState.value.copy(error = it.message) }
                .collect { bands ->
                    _uiState.value = _uiState.value.copy(
                        bands = bands,
                        isSearching = false
                    )
                }
        }
    }

    /**
     * Get sample venues data for testing or fallback.
     */
    private fun getSampleVenues(): List<Venue> {
        return listOf(
            Venue(
                id = "v1",
                name = "The Sound Garden",
                address = "123 Main St",
                city = "Brooklyn",
                state = "NY",
                zipCode = "11201",
                description = "A legendary venue known for launching indie bands",
                imageUrl = "https://picsum.photos/id/1035/500/300",
                rating = 4.5f,
                reviewCount = 120,
                capacity = 500,
                contactInfo = "info@soundgarden.com",
                distance = 0.8f,
                amenities = listOf("Live Music", "Full Bar", "Food Service")
            ),
            Venue(
                id = "v2",
                name = "Electric Avenue",
                address = "456 Park Ave",
                city = "Brooklyn",
                state = "NY",
                zipCode = "11205",
                description = "Modern venue with great acoustics and lighting",
                imageUrl = "https://picsum.photos/id/1036/500/300",
                rating = 4.2f,
                reviewCount = 85,
                capacity = 350,
                contactInfo = "contact@electricavenue.com",
                distance = 1.2f,
                amenities = listOf("DJ Booth", "Dance Floor", "Cocktail Bar")
            ),
            Venue(
                id = "v3",
                name = "The Basement",
                address = "789 Broadway",
                city = "Brooklyn",
                state = "NY",
                zipCode = "11206",
                description = "Underground venue featuring indie bands and craft beer",
                imageUrl = "https://picsum.photos/id/1037/500/300",
                rating = 4.8f,
                reviewCount = 210,
                capacity = 200,
                contactInfo = "basement@music.com",
                distance = 1.5f,
                amenities = listOf("Indie Bands", "Craft Beer", "Intimate Setting")
            )
        )
    }

    /**
     * Get sample bands data for testing or fallback.
     */
    private fun getSampleBands(): List<Band> {
        return listOf(
            Band(
                id = "b1",
                name = "Electric Harmony",
                genre = "Rock",
                bio = "A four-piece band known for energetic performances",
                imageUrl = "https://picsum.photos/id/1038/500/300",
                formationYear = 2018,
                location = "Brooklyn, NY",
                rating = 4.7f,
                reviewCount = 156,
                genres = listOf("Rock", "Alternative", "Indie"),
                nextShow = "Tonight at The Sound Garden",
                socialLinks = listOf(
                    Pair("Instagram", "https://instagram.com/electricharmony"),
                    Pair("Twitter", "https://twitter.com/electricharmony")
                )
            ),
            Band(
                id = "b2",
                name = "Midnight Groove",
                genre = "R&B",
                bio = "Soul collective bringing back classic sounds with a modern twist",
                imageUrl = "https://picsum.photos/id/1039/500/300",
                formationYear = 2016,
                location = "Queens, NY",
                rating = 4.3f,
                reviewCount = 98,
                genres = listOf("R&B", "Soul", "Funk"),
                nextShow = "Tomorrow at Electric Avenue",
                socialLinks = listOf(
                    Pair("Instagram", "https://instagram.com/midnightgroove"),
                    Pair("YouTube", "https://youtube.com/midnightgroove")
                )
            ),
            Band(
                id = "b3",
                name = "Cosmic Travelers",
                genre = "Psychedelic",
                bio = "Experimental space rock outfit pushing musical boundaries",
                imageUrl = "https://picsum.photos/id/1040/500/300",
                formationYear = 2020,
                location = "Manhattan, NY",
                rating = 4.9f,
                reviewCount = 230,
                genres = listOf("Psychedelic", "Space Rock", "Experimental"),
                nextShow = "Sat at The Basement",
                socialLinks = listOf(
                    Pair("Bandcamp", "https://cosmictravelers.bandcamp.com"),
                    Pair("SoundCloud", "https://soundcloud.com/cosmictravelers")
                )
            )
        )
    }
}

/**
 * UI state for the Home screen.
 */
data class HomeUiState(
    val venues: List<Venue> = emptyList(),
    val bands: List<Band> = emptyList(),
    val user: User? = null,
    val isLoading: Boolean = true,
    val isSearching: Boolean = false,
    val error: String? = null
)
