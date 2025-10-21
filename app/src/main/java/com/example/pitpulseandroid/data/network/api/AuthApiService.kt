package com.example.pitpulseandroid.data.network.api

import com.example.pitpulseandroid.data.network.ApiResponse
import com.example.pitpulseandroid.data.network.dto.AuthResponse
import com.example.pitpulseandroid.data.network.dto.LoginRequest
import com.example.pitpulseandroid.data.network.dto.RegisterRequest
import com.example.pitpulseandroid.data.network.dto.UserDto
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST

/**
 * API service for authentication endpoints
 */
interface AuthApiService {
    
    @POST("users/register")
    suspend fun register(
        @Body request: RegisterRequest
    ): Response<ApiResponse<UserDto>>
    
    @POST("users/login")
    suspend fun login(
        @Body request: LoginRequest
    ): Response<ApiResponse<AuthResponse>>
    
    @GET("users/me")
    suspend fun getCurrentUser(): Response<ApiResponse<UserDto>>
}
