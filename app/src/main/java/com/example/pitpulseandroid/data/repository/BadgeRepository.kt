package com.example.pitpulseandroid.data.repository

import com.example.pitpulseandroid.data.model.Badge
import com.example.pitpulseandroid.data.model.BadgeType
import com.example.pitpulseandroid.data.network.NetworkModule
import com.example.pitpulseandroid.data.network.api.BadgeApi
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class BadgeRepository {
    private val api: BadgeApi = NetworkModule.createApiService()

    suspend fun fetchAllBadges(): List<Badge> = withContext(Dispatchers.IO) {
        val response = api.getAllBadges()
        val dtos = response.data ?: emptyList()
        dtos.map { dto ->
            Badge(
                id = dto.id,
                name = dto.name,
                description = dto.description ?: "",
                imageUrl = dto.iconUrl ?: "",
                icon = 0, // Using remote image for now
                badgeType = mapType(dto.badgeType),
                threshold = dto.requirementValue ?: 0
            )
        }
    }

    private fun mapType(type: String): BadgeType = when (type) {
        "review_count", "helpful_count" -> BadgeType.REVIEW
        "venue_explorer" -> BadgeType.VENUE_VISIT
        "event_attendance" -> BadgeType.SPECIAL_EVENT
        "music_lover" -> BadgeType.REVIEW // map to REVIEW for now
        else -> BadgeType.REVIEW
    }
}

