package com.example.pitpulseandroid.ui.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.pitpulseandroid.data.model.Band
import com.example.pitpulseandroid.data.model.Venue
import com.example.pitpulseandroid.data.repository.Repository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.launch

/**
 * ViewModel for the Home screen.
 */
class HomeViewModel(private val repository: Repository) : ViewModel() {

    private val _uiState = MutableStateFlow(HomeUiState())
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    private val _featuredVenues = MutableStateFlow<List<Venue>>(emptyList())
    val featuredVenues: StateFlow<List<Venue>> = _featuredVenues.asStateFlow()

    private val _popularBands = MutableStateFlow<List<Band>>(emptyList())
    val popularBands: StateFlow<List<Band>> = _popularBands.asStateFlow()

    init {
        loadHomeData()
    }

    private fun loadHomeData() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            repository.initMockData()

            repository.getVenues()
                .onEach { venues: List<Venue> ->
                    _featuredVenues.value = venues
                    _uiState.value = _uiState.value.copy(isLoading = false)
                }
                .catch { e: Throwable ->
                    _uiState.value = _uiState.value.copy(isLoading = false, error = e.message)
                }
                .launchIn(viewModelScope)

            repository.getBands()
                .onEach { bands: List<Band> ->
                    _popularBands.value = bands
                }
                .catch { e: Throwable ->
                    _uiState.value = _uiState.value.copy(isLoading = false, error = e.message)
                }
                .launchIn(viewModelScope)
        }
    }

    fun retryLoading() {
        loadHomeData()
    }

    fun refreshData() {
        loadHomeData()
    }

    // This function is kept in case it's needed in the future
    fun clearError() {
        _uiState.value = _uiState.value.copy(error = null)
    }
}

/**
 * UI state for the Home screen.
 */
data class HomeUiState(
    val isLoading: Boolean = false,
    val featuredVenues: List<Venue> = emptyList(),
    val popularBands: List<Band> = emptyList(),
    val error: String? = null
)
