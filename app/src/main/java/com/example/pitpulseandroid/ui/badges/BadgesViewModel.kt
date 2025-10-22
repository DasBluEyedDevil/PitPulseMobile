package com.example.pitpulseandroid.ui.badges

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.pitpulseandroid.data.model.Badge
import com.example.pitpulseandroid.data.model.BadgeProgress
import com.example.pitpulseandroid.data.repository.BadgeRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import kotlin.random.Random

data class BadgesUiState(
    val isLoading: Boolean = true,
    val error: String? = null,
    val badgeProgress: List<BadgeProgress> = emptyList()
)

class BadgesViewModel(
    private val repository: BadgeRepository = BadgeRepository()
) : ViewModel() {

    private val _uiState = MutableStateFlow(BadgesUiState())
    val uiState: StateFlow<BadgesUiState> = _uiState

    init {
        loadBadges()
    }

    fun loadBadges() {
        _uiState.value = _uiState.value.copy(isLoading = true, error = null)
        viewModelScope.launch {
            try {
                val badges = repository.fetchAllBadges().ifEmpty { Badge.getSampleBadges() }
                _uiState.value = BadgesUiState(
                    isLoading = false,
                    error = null,
                    badgeProgress = toProgress(badges)
                )
            } catch (e: Exception) {
                val fallback = Badge.getSampleBadges()
                _uiState.value = BadgesUiState(
                    isLoading = false,
                    error = e.message ?: "Failed to load badges",
                    badgeProgress = toProgress(fallback)
                )
            }
        }
    }

    private fun toProgress(badges: List<Badge>): List<BadgeProgress> {
        // Temporary: generate progress locally until /api/badges/my-progress is wired
        return badges.map { badge ->
            val current = Random.nextInt(0, (badge.threshold.coerceAtLeast(1)) * 2)
            BadgeProgress(
                badge = badge,
                currentValue = current
            )
        }
    }
}

