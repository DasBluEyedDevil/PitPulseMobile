package com.example.pitpulseandroid.data.network.api

import com.example.pitpulseandroid.data.network.ApiResponse
import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass
import retrofit2.http.GET

@JsonClass(generateAdapter = true)
data class BackendBadgeDto(
    @Json(name = "id") val id: String,
    @Json(name = "name") val name: String,
    @Json(name = "description") val description: String? = null,
    @Json(name = "iconUrl") val iconUrl: String? = null,
    @Json(name = "badgeType") val badgeType: String,
    @Json(name = "requirementValue") val requirementValue: Int? = null,
    @Json(name = "color") val color: String? = null
)

interface BadgeApi {
    @GET("badges")
    suspend fun getAllBadges(): ApiResponse<List<BackendBadgeDto>>
}

