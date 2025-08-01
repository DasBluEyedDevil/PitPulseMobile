package com.example.pitpulseandroid.ui.bands

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.example.pitpulseandroid.data.model.Band
import com.example.pitpulseandroid.data.repository.Repository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

@Suppress("unused")
class BandDetailViewModel(private val repository: Repository, private val bandId: String) : ViewModel() {

    private val _band = MutableStateFlow<Band?>(null)
    val band: StateFlow<Band?> = _band.asStateFlow()

    private val _relatedBands = MutableStateFlow<List<Band>>(emptyList())
    val relatedBands: StateFlow<List<Band>> = _relatedBands.asStateFlow()

    private val _reviews = MutableStateFlow<List<String>>(emptyList())
    val reviews: StateFlow<List<String>> = _reviews.asStateFlow()

    init {
        viewModelScope.launch {
            _band.value = repository.getBandDetails(bandId)
            _relatedBands.value = repository.getRelatedBands(bandId)
            _reviews.value = repository.getReviewsForBand(bandId)
        }
    }

    class Factory(private val repository: Repository, private val bandId: String) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T {
            if (modelClass.isAssignableFrom(BandDetailViewModel::class.java)) {
                return BandDetailViewModel(repository, bandId) as T
            }
            throw IllegalArgumentException("Unknown ViewModel class")
        }
    }
}
