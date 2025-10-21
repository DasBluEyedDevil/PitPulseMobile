package com.example.pitpulseandroid.data.storage

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.firstOrNull
import kotlinx.coroutines.flow.map

/**
 * Extension property for DataStore
 */
private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "auth_preferences")

/**
 * Manager for storing and retrieving authentication tokens
 */
class TokenManager(private val context: Context) {
    
    companion object {
        private val TOKEN_KEY = stringPreferencesKey("auth_token")
        private val USER_ID_KEY = stringPreferencesKey("user_id")
        private val USERNAME_KEY = stringPreferencesKey("username")
        private val EMAIL_KEY = stringPreferencesKey("email")
    }
    
    /**
     * Save authentication token
     */
    suspend fun saveToken(token: String) {
        context.dataStore.edit { preferences ->
            preferences[TOKEN_KEY] = token
        }
    }
    
    /**
     * Save user information
     */
    suspend fun saveUserInfo(userId: String, username: String, email: String) {
        context.dataStore.edit { preferences ->
            preferences[USER_ID_KEY] = userId
            preferences[USERNAME_KEY] = username
            preferences[EMAIL_KEY] = email
        }
    }
    
    /**
     * Get authentication token as Flow
     */
    fun getTokenFlow(): Flow<String?> {
        return context.dataStore.data.map { preferences ->
            preferences[TOKEN_KEY]
        }
    }
    
    /**
     * Get authentication token (suspend function)
     */
    suspend fun getToken(): String? {
        return getTokenFlow().firstOrNull()
    }
    
    /**
     * Get user ID
     */
    suspend fun getUserId(): String? {
        return context.dataStore.data.map { preferences ->
            preferences[USER_ID_KEY]
        }.firstOrNull()
    }
    
    /**
     * Get username
     */
    suspend fun getUsername(): String? {
        return context.dataStore.data.map { preferences ->
            preferences[USERNAME_KEY]
        }.firstOrNull()
    }
    
    /**
     * Get email
     */
    suspend fun getEmail(): String? {
        return context.dataStore.data.map { preferences ->
            preferences[EMAIL_KEY]
        }.firstOrNull()
    }
    
    /**
     * Check if user is logged in
     */
    suspend fun isLoggedIn(): Boolean {
        return getToken() != null
    }
    
    /**
     * Clear all authentication data (logout)
     */
    suspend fun clearAuth() {
        context.dataStore.edit { preferences ->
            preferences.clear()
        }
    }
}
