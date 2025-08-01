package com.example.pitpulseandroid.ui.venues

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.example.pitpulseandroid.data.model.Venue
import com.example.pitpulseandroid.data.repository.Repository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class VenueDetailViewModel(
    private val repository: Repository,
    private val venueId: String
) : ViewModel() {

    private val _venue = MutableStateFlow<Venue?>(null)
    val venue: StateFlow<Venue?> = _venue.asStateFlow()

    init {
        viewModelScope.launch {
            _venue.value = repository.getVenueDetails(venueId)
        }
    }

    class Factory(private val repository: Repository, private val venueId: String) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T {
            if (modelClass.isAssignableFrom(VenueDetailViewModel::class.java)) {
                return VenueDetailViewModel(repository, venueId) as T
            }
            throw IllegalArgumentException("Unknown ViewModel class")
        }
    }
}
