package com.example.pitpulseandroid.data.network

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

/**
 * Generic API response wrapper matching backend response format
 */
@JsonClass(generateAdapter = true)
data class ApiResponse<T>(
    @Json(name = "success")
    val success: Boolean,
    
    @Json(name = "data")
    val data: T? = null,
    
    @Json(name = "error")
    val error: String? = null,
    
    @Json(name = "message")
    val message: String? = null
)

/**
 * Sealed class for handling API results
 */
sealed class Resource<T> {
    data class Success<T>(val data: T) : Resource<T>()
    data class Error<T>(val message: String, val data: T? = null) : Resource<T>()
    class Loading<T> : Resource<T>()
}

/**
 * Extension function to convert ApiResponse to Resource
 */
fun <T> ApiResponse<T>.toResource(): Resource<T> {
    return if (success && data != null) {
        Resource.Success(data)
    } else {
        Resource.Error(error ?: "Unknown error occurred")
    }
}
