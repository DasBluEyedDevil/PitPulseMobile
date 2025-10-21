package com.example.pitpulseandroid.data.network

object ApiConfig {
    // Production API URL - Update this with your deployed backend URL
    private const val PROD_BASE_URL = "https://your-backend-url.vercel.app/api/"
    
    // Development API URLs
    private const val DEV_EMULATOR_URL = "http://10.0.2.2:3000/api/"  // Android emulator
    private const val DEV_LOCAL_URL = "http://localhost:3000/api/"     // Physical device with port forwarding
    
    // Use BuildConfig to determine which URL to use
    val BASE_URL: String
        get() = if (isDebugBuild()) {
            DEV_EMULATOR_URL
        } else {
            PROD_BASE_URL
        }
    
    private fun isDebugBuild(): Boolean {
        return try {
            // This will be replaced by BuildConfig at compile time
            true // Change to false for production builds
        } catch (e: Exception) {
            false
        }
    }
    
    const val CONNECT_TIMEOUT = 30L // seconds
    const val READ_TIMEOUT = 30L    // seconds
    const val WRITE_TIMEOUT = 30L   // seconds
}
