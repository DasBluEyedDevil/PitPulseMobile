package com.example.pitpulseandroid.data.model

/**
 * Data class representing a review for a venue or band.
 */
data class Review(
    val id: String,
    val username: String,
    val avatar: String, // URL or local drawable resource name
    val date: String,
    val rating: Int,
    val content: String,
    val likes: Int
)