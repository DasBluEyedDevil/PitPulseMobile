package com.example.pitpulseandroid.data.network.api

import com.example.pitpulseandroid.data.model.Band
import com.example.pitpulseandroid.data.network.ApiResponse
import retrofit2.Response
import retrofit2.http.GET
import retrofit2.http.Path
import retrofit2.http.Query

/**
 * API service for band endpoints
 */
interface BandApiService {
    
    @GET("bands")
    suspend fun getBands(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20,
        @Query("search") search: String? = null,
        @Query("genre") genre: String? = null
    ): Response<ApiResponse<List<Band>>>
    
    @GET("bands/{id}")
    suspend fun getBandById(
        @Path("id") bandId: String
    ): Response<ApiResponse<Band>>
    
    @GET("bands/popular")
    suspend fun getPopularBands(
        @Query("limit") limit: Int = 10
    ): Response<ApiResponse<List<Band>>>
    
    @GET("bands/trending")
    suspend fun getTrendingBands(
        @Query("limit") limit: Int = 10
    ): Response<ApiResponse<List<Band>>>
    
    @GET("bands/genres")
    suspend fun getGenres(): Response<ApiResponse<List<String>>>
}
