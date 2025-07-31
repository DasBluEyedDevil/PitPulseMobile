package com.example.pitpulseandroid.data.model

/**
 * Data class representing a badge that can be earned by users.
 */
data class Badge(
    val name: String,
    val description: String,
    val icon: String // emoji or icon identifier
)