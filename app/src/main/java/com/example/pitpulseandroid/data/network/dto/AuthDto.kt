package com.example.pitpulseandroid.data.network.dto

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class LoginRequest(
    @Json(name = "email")
    val email: String,
    
    @Json(name = "password")
    val password: String
)

@JsonClass(generateAdapter = true)
data class RegisterRequest(
    @Json(name = "email")
    val email: String,
    
    @Json(name = "password")
    val password: String,
    
    @Json(name = "username")
    val username: String,
    
    @Json(name = "firstName")
    val firstName: String? = null,
    
    @Json(name = "lastName")
    val lastName: String? = null
)

@JsonClass(generateAdapter = true)
data class AuthResponse(
    @Json(name = "user")
    val user: UserDto,
    
    @Json(name = "token")
    val token: String
)

@JsonClass(generateAdapter = true)
data class UserDto(
    @Json(name = "id")
    val id: String,
    
    @Json(name = "email")
    val email: String,
    
    @Json(name = "username")
    val username: String,
    
    @Json(name = "firstName")
    val firstName: String? = null,
    
    @Json(name = "lastName")
    val lastName: String? = null,
    
    @Json(name = "bio")
    val bio: String? = null,
    
    @Json(name = "profileImageUrl")
    val profileImageUrl: String? = null,
    
    @Json(name = "location")
    val location: String? = null,
    
    @Json(name = "isVerified")
    val isVerified: Boolean = false,
    
    @Json(name = "createdAt")
    val createdAt: String
)
