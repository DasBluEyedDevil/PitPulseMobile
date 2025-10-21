package com.example.pitpulseandroid.data.repository

import android.content.Context
import com.example.pitpulseandroid.data.model.Band
import com.example.pitpulseandroid.data.model.Venue
import com.example.pitpulseandroid.data.network.NetworkModule
import com.example.pitpulseandroid.data.network.Resource
import com.example.pitpulseandroid.data.network.api.AuthApiService
import com.example.pitpulseandroid.data.network.api.BandApiService
import com.example.pitpulseandroid.data.network.api.VenueApiService
import com.example.pitpulseandroid.data.network.dto.LoginRequest
import com.example.pitpulseandroid.data.network.dto.RegisterRequest
import com.example.pitpulseandroid.data.network.dto.AuthResponse
import com.example.pitpulseandroid.data.storage.TokenManager
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import retrofit2.Response

/**
 * Repository for API calls - replaces the mock Repository
 */
class ApiRepository(context: Context) {
    
    private val tokenManager = TokenManager(context)
    
    // Create API services with token provider
    private val authApi: AuthApiService by lazy {
        NetworkModule.createApiService()
    }
    
    private val venueApi: VenueApiService by lazy {
        NetworkModule.createApiService { 
            // This will be called for each request to get the latest token
            kotlinx.coroutines.runBlocking { tokenManager.getToken() }
        }
    }
    
    private val bandApi: BandApiService by lazy {
        NetworkModule.createApiService {
            kotlinx.coroutines.runBlocking { tokenManager.getToken() }
        }
    }
    
    // ==================== Authentication ====================
    
    /**
     * Register a new user
     */
    suspend fun register(
        email: String,
        password: String,
        username: String,
        firstName: String? = null,
        lastName: String? = null
    ): Resource<Unit> {
        return try {
            val request = RegisterRequest(email, password, username, firstName, lastName)
            val response = authApi.register(request)
            
            if (response.isSuccessful && response.body()?.success == true) {
                Resource.Success(Unit)
            } else {
                Resource.Error(response.body()?.error ?: "Registration failed")
            }
        } catch (e: Exception) {
            Resource.Error(e.message ?: "Network error")
        }
    }
    
    /**
     * Login user
     */
    suspend fun login(email: String, password: String): Resource<AuthResponse> {
        return try {
            val request = LoginRequest(email, password)
            val response = authApi.login(request)
            
            if (response.isSuccessful && response.body()?.success == true) {
                val authResponse = response.body()?.data
                if (authResponse != null) {
                    // Save token and user info
                    tokenManager.saveToken(authResponse.token)
                    tokenManager.saveUserInfo(
                        userId = authResponse.user.id,
                        username = authResponse.user.username,
                        email = authResponse.user.email
                    )
                    Resource.Success(authResponse)
                } else {
                    Resource.Error("Invalid response")
                }
            } else {
                Resource.Error(response.body()?.error ?: "Login failed")
            }
        } catch (e: Exception) {
            Resource.Error(e.message ?: "Network error")
        }
    }
    
    /**
     * Logout user
     */
    suspend fun logout() {
        tokenManager.clearAuth()
    }
    
    /**
     * Check if user is logged in
     */
    suspend fun isLoggedIn(): Boolean {
        return tokenManager.isLoggedIn()
    }
    
    // ==================== Venues ====================
    
    /**
     * Get venues as Flow
     */
    fun getVenues(
        search: String? = null,
        city: String? = null,
        type: String? = null
    ): Flow<Resource<List<Venue>>> = flow {
        emit(Resource.Loading())
        try {
            val response = venueApi.getVenues(search = search, city = city, type = type)
            emit(handleApiResponse(response))
        } catch (e: Exception) {
            emit(Resource.Error(e.message ?: "Failed to fetch venues"))
        }
    }
    
    /**
     * Get venue by ID
     */
    suspend fun getVenueById(venueId: String): Resource<Venue> {
        return try {
            val response = venueApi.getVenueById(venueId)
            handleApiResponse(response)
        } catch (e: Exception) {
            Resource.Error(e.message ?: "Failed to fetch venue details")
        }
    }
    
    /**
     * Get popular venues
     */
    suspend fun getPopularVenues(limit: Int = 10): Resource<List<Venue>> {
        return try {
            val response = venueApi.getPopularVenues(limit)
            handleApiResponse(response)
        } catch (e: Exception) {
            Resource.Error(e.message ?: "Failed to fetch popular venues")
        }
    }
    
    // ==================== Bands ====================
    
    /**
     * Get bands as Flow
     */
    fun getBands(
        search: String? = null,
        genre: String? = null
    ): Flow<Resource<List<Band>>> = flow {
        emit(Resource.Loading())
        try {
            val response = bandApi.getBands(search = search, genre = genre)
            emit(handleApiResponse(response))
        } catch (e: Exception) {
            emit(Resource.Error(e.message ?: "Failed to fetch bands"))
        }
    }
    
    /**
     * Get band by ID
     */
    suspend fun getBandById(bandId: String): Resource<Band> {
        return try {
            val response = bandApi.getBandById(bandId)
            handleApiResponse(response)
        } catch (e: Exception) {
            Resource.Error(e.message ?: "Failed to fetch band details")
        }
    }
    
    /**
     * Get popular bands
     */
    suspend fun getPopularBands(limit: Int = 10): Resource<List<Band>> {
        return try {
            val response = bandApi.getPopularBands(limit)
            handleApiResponse(response)
        } catch (e: Exception) {
            Resource.Error(e.message ?: "Failed to fetch popular bands")
        }
    }
    
    /**
     * Get trending bands
     */
    suspend fun getTrendingBands(limit: Int = 10): Resource<List<Band>> {
        return try {
            val response = bandApi.getTrendingBands(limit)
            handleApiResponse(response)
        } catch (e: Exception) {
            Resource.Error(e.message ?: "Failed to fetch trending bands")
        }
    }
    
    // ==================== Helper Functions ====================
    
    /**
     * Handle API response and convert to Resource
     */
    private fun <T> handleApiResponse(response: Response<com.example.pitpulseandroid.data.network.ApiResponse<T>>): Resource<T> {
        return if (response.isSuccessful) {
            val body = response.body()
            if (body?.success == true && body.data != null) {
                Resource.Success(body.data)
            } else {
                Resource.Error(body?.error ?: "Unknown error")
            }
        } else {
            Resource.Error("HTTP ${response.code()}: ${response.message()}")
        }
    }
}
