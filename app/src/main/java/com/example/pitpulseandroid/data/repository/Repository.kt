package com.example.pitpulseandroid.data.repository

import com.example.pitpulseandroid.data.model.Band
import com.example.pitpulseandroid.data.model.Venue
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow

class Repository {

    // This method is kept for compatibility but marked as internal
    @Suppress("unused")
    internal suspend fun getFeaturedVenues(): List<Venue> {
        // Simulate network delay
        delay(500)
        return listOf(
            Venue(
                id = "1", 
                name = "The Rock Club", 
                address = "123 Main St", 
                city = "New York", 
                state = "NY", 
                zipCode = "10001", 
                description = "A premier rock venue", 
                capacity = 500, 
                amenities = listOf("Bar", "VIP Area", "Smoking Area"), 
                contactInfo = "info@rockclub.com", 
                image = "https://picsum.photos/id/1025/500/300", 
                rating = 4.5f, 
                reviewCount = 120, 
                distance = "0.5 miles"
            ),
            Venue(
                id = "2", 
                name = "Jazz Lounge", 
                address = "456 Broadway", 
                city = "New York", 
                state = "NY", 
                zipCode = "10002", 
                description = "Intimate jazz venue", 
                capacity = 200, 
                amenities = listOf("Full Bar", "Restaurant", "Private Booths"), 
                contactInfo = "bookings@jazzlounge.com", 
                image = "https://picsum.photos/id/1026/500/300", 
                rating = 4.7f, 
                reviewCount = 85, 
                distance = "1.2 miles"
            ),
            Venue(
                id = "3", 
                name = "Concert Hall", 
                address = "789 Park Ave", 
                city = "New York", 
                state = "NY", 
                zipCode = "10003", 
                description = "Large concert venue for major acts", 
                capacity = 1000, 
                amenities = listOf("Multiple Bars", "Premium Sound System", "VIP Boxes"), 
                contactInfo = "info@concerthall.com", 
                image = "https://picsum.photos/id/1027/500/300", 
                rating = 4.2f, 
                reviewCount = 210, 
                distance = "2.0 miles"
            )
        )
    }

    // This method is kept for compatibility but marked as internal
    @Suppress("unused")
    internal suspend fun getPopularBands(): List<Band> {
        // Simulate network delay
        delay(500)
        return Band.getSampleBands()
    }

    // Initialize mock data - called from ViewModels
    fun initMockData() {
        // No-op for now, could be used to pre-populate data in a real app
    }

    // Get venues as a Flow
    fun getVenues(): Flow<List<Venue>> = flow {
        delay(500) // Simulate network delay
        emit(getFeaturedVenues())
    }

    // Get venue details
    suspend fun getVenueDetails(venueId: String): Venue {
        // Simulate network delay
        delay(300)
        return getFeaturedVenues().find { it.id == venueId } ?: getFeaturedVenues().first()
    }

    // Get bands as a Flow
    fun getBands(): Flow<List<Band>> = flow {
        delay(500) // Simulate network delay
        emit(Band.getSampleBands())
    }

    // Get band details
    suspend fun getBandDetails(bandId: String): Band {
        // Simulate network delay
        delay(300)
        return Band.getSampleBands().find { it.id == bandId } ?: Band.getSampleBands().first()
    }

    // Get related bands
    suspend fun getRelatedBands(bandId: String): List<Band> {
        // Simulate network delay
        delay(300)
        // Return a subset of sample bands, excluding the current one
        return Band.getSampleBands().filter { it.id != bandId }.take(2)
    }

    // Get reviews for a band
    suspend fun getReviewsForBand(bandId: String): List<String> {
        // Simulate network delay
        delay(300)
        return listOf(
            "Great live performance! Would definitely see them again.",
            "The vocalist has an amazing range. Incredible show!",
            "Good energy but the sound quality could have been better."
        )
    }

    // Search bands
    fun searchBands(query: String): Flow<List<Band>> = flow {
        delay(300) // Simulate network delay
        val results = Band.getSampleBands().filter { 
            it.name.contains(query, ignoreCase = true) || 
            it.genre.contains(query, ignoreCase = true)
        }
        emit(results)
    }
}
