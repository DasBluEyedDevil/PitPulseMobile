package com.example.pitpulseandroid.data

import com.example.pitpulseandroid.data.model.Badge
import com.example.pitpulseandroid.data.model.Band
import com.example.pitpulseandroid.data.model.Review
import com.example.pitpulseandroid.data.model.User
import com.example.pitpulseandroid.data.model.Venue
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow

/**
 * Repository for accessing data in the app.
 * This is a mock implementation that returns hardcoded data.
 */
class Repository {
    
    /**
     * Get all venues.
     */
    fun getVenues(): Flow<List<Venue>> = flow {
        // Simulate network delay
        delay(500)
        emit(MockData.venues)
    }
    
    /**
     * Get a venue by ID.
     */
    fun getVenueById(id: String): Flow<Venue?> = flow {
        // Simulate network delay
        delay(300)
        emit(MockData.venues.find { it.id == id })
    }
    
    /**
     * Get all bands.
     */
    fun getBands(): Flow<List<Band>> = flow {
        // Simulate network delay
        delay(500)
        emit(MockData.bands)
    }
    
    /**
     * Get a band by ID.
     */
    fun getBandById(id: String): Flow<Band?> = flow {
        // Simulate network delay
        delay(300)
        emit(MockData.bands.find { it.id == id })
    }
    
    /**
     * Get reviews for a venue.
     */
    fun getVenueReviews(venueId: String): Flow<List<Review>> = flow {
        // Simulate network delay
        delay(400)
        // In a real app, we would filter reviews by venue ID
        // For now, just return all reviews
        emit(MockData.reviews)
    }
    
    /**
     * Get reviews for a band.
     */
    fun getBandReviews(bandId: String): Flow<List<Review>> = flow {
        // Simulate network delay
        delay(400)
        // In a real app, we would filter reviews by band ID
        // For now, just return all reviews
        emit(MockData.reviews)
    }
    
    /**
     * Get the current user.
     */
    fun getCurrentUser(): Flow<User> = flow {
        // Simulate network delay
        delay(200)
        emit(MockData.currentUser)
    }
    
    /**
     * Get all badges.
     */
    fun getAllBadges(): Flow<List<Badge>> = flow {
        // Simulate network delay
        delay(300)
        emit(MockData.badges)
    }
    
    /**
     * Search venues by name.
     */
    fun searchVenues(query: String): Flow<List<Venue>> = flow {
        // Simulate network delay
        delay(300)
        if (query.isBlank()) {
            emit(MockData.venues)
        } else {
            emit(MockData.venues.filter { 
                it.name.contains(query, ignoreCase = true) || 
                it.address.contains(query, ignoreCase = true)
            })
        }
    }
    
    /**
     * Search bands by name or genre.
     */
    fun searchBands(query: String): Flow<List<Band>> = flow {
        // Simulate network delay
        delay(300)
        if (query.isBlank()) {
            emit(MockData.bands)
        } else {
            emit(MockData.bands.filter { 
                it.name.contains(query, ignoreCase = true) || 
                it.genre.contains(query, ignoreCase = true)
            })
        }
    }
    
    companion object {
        // Singleton instance
        @Volatile
        private var INSTANCE: Repository? = null
        
        fun getInstance(): Repository {
            return INSTANCE ?: synchronized(this) {
                val instance = Repository()
                INSTANCE = instance
                instance
            }
        }
    }
}