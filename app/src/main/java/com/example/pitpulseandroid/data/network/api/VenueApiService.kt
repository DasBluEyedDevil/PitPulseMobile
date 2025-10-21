package com.example.pitpulseandroid.data.network.api

import com.example.pitpulseandroid.data.model.Venue
import com.example.pitpulseandroid.data.network.ApiResponse
import retrofit2.Response
import retrofit2.http.GET
import retrofit2.http.Path
import retrofit2.http.Query

/**
 * API service for venue endpoints
 */
interface VenueApiService {
    
    @GET("venues")
    suspend fun getVenues(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20,
        @Query("search") search: String? = null,
        @Query("city") city: String? = null,
        @Query("type") type: String? = null
    ): Response<ApiResponse<List<Venue>>>
    
    @GET("venues/{id}")
    suspend fun getVenueById(
        @Path("id") venueId: String
    ): Response<ApiResponse<Venue>>
    
    @GET("venues/popular")
    suspend fun getPopularVenues(
        @Query("limit") limit: Int = 10
    ): Response<ApiResponse<List<Venue>>>
    
    @GET("venues/near")
    suspend fun getNearbyVenues(
        @Query("latitude") latitude: Double,
        @Query("longitude") longitude: Double,
        @Query("radius") radius: Double = 10.0,
        @Query("limit") limit: Int = 20
    ): Response<ApiResponse<List<Venue>>>
}
