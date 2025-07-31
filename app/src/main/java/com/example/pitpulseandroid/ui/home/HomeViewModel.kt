package com.example.pitpulseandroid.ui.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.example.pitpulseandroid.data.Repository
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
 */
class HomeViewModel(private val repository: Repository) : ViewModel() {

    // UI state for the Home screen
    private val _uiState = MutableStateFlow(HomeUiState())
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    init {
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
                image = "https://picsum.photos/id/1035/500/300",
                rating = 4.5,
                reviewCount = 120,
                address = "123 Main St, Brooklyn, NY",
                distance = "0.8 mi",
                amenities = listOf("Live Music", "Full Bar", "Food")
            ),
            Venue(
                id = "v2",
                name = "Electric Avenue",
                image = "https://picsum.photos/id/1036/500/300",
                rating = 4.2,
                reviewCount = 85,
                address = "456 Park Ave, Brooklyn, NY",
                distance = "1.2 mi",
                amenities = listOf("DJ Booth", "Dance Floor", "Cocktails")
            ),
            Venue(
                id = "v3",
                name = "The Basement",
                image = "https://picsum.photos/id/1037/500/300",
                rating = 4.8,
                reviewCount = 210,
                address = "789 Broadway, Brooklyn, NY",
                distance = "1.5 mi",
                amenities = listOf("Underground", "Indie Bands", "Craft Beer")
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
                nextShow = "Sat at The Basement"
            )
        )
    }

    /**
     * Factory for creating HomeViewModel instances.
     */
    class Factory : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T {
            if (modelClass.isAssignableFrom(HomeViewModel::class.java)) {
                return HomeViewModel(Repository.getInstance()) as T
            }
            throw IllegalArgumentException("Unknown ViewModel class")
        }
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
