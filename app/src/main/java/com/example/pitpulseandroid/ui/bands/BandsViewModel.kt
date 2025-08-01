package com.example.pitpulseandroid.ui.bands

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.pitpulseandroid.data.model.Band
import com.example.pitpulseandroid.data.repository.Repository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach

@Suppress("unused")
class BandsViewModel(private val repository: Repository) : ViewModel() {

    private val _bands = MutableStateFlow<List<Band>>(emptyList())
    val bands: StateFlow<List<Band>> = _bands.asStateFlow()

    private val _searchQuery = MutableStateFlow("")
    val searchQuery: StateFlow<String> = _searchQuery.asStateFlow()

    init {
        repository.initMockData()
        repository.getBands().onEach { bandsList ->
            _bands.value = bandsList
        }.launchIn(viewModelScope)
    }

    fun onSearchQueryChange(query: String) {
        _searchQuery.value = query
        // In a real app, you'd likely have the repository handle the search
        if (query.isBlank()) {
            repository.getBands().onEach { bandsList ->
                _bands.value = bandsList
            }.launchIn(viewModelScope)
        } else {
            repository.searchBands(query).onEach { searchResults ->
                _bands.value = searchResults
            }.launchIn(viewModelScope)
        }
    }
}
