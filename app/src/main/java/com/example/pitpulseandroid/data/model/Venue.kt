package com.example.pitpulseandroid.data.model

data class Venue(
    val id: String,
    val name: String,
    val address: String,
    val city: String,
    val state: String,
    val zipCode: String,
    val description: String,
    val capacity: Int,
    val amenities: List<String>,
    val contactInfo: String,
    val image: String,
    val rating: Float,
    val reviewCount: Int,
    val distance: String
)

