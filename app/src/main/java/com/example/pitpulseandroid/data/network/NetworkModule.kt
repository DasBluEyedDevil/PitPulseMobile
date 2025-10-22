package com.example.pitpulseandroid.data.network

import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory
import java.util.concurrent.TimeUnit

/**
 * Network module for creating Retrofit and OkHttp instances
 */
object NetworkModule {
    
    /**
     * Create Moshi instance for JSON parsing
     */
    private fun createMoshi(): Moshi {
        return Moshi.Builder()
            .add(KotlinJsonAdapterFactory())
            .build()
    }
    
    /**
     * Create authentication interceptor
     */
    private fun createAuthInterceptor(tokenProvider: () -> String?): Interceptor {
        return Interceptor { chain ->
            val originalRequest = chain.request()
            val token = tokenProvider()
            
            val newRequest = if (token != null) {
                originalRequest.newBuilder()
                    .header("Authorization", "Bearer $token")
                    .build()
            } else {
                originalRequest
            }
            
            chain.proceed(newRequest)
        }
    }
    
    /**
     * Create logging interceptor for debugging
     */
    private fun createLoggingInterceptor(): HttpLoggingInterceptor {
        return HttpLoggingInterceptor().apply {
            level = if (ApiConfig.isDebugBuild()) {
                HttpLoggingInterceptor.Level.BODY
            } else {
                HttpLoggingInterceptor.Level.NONE
            }
        }
    }
    
    /**
     * Create OkHttp client
     */
    fun createOkHttpClient(tokenProvider: () -> String? = { null }): OkHttpClient {
        return OkHttpClient.Builder()
            .addInterceptor(createAuthInterceptor(tokenProvider))
            .addInterceptor(createLoggingInterceptor())
            .connectTimeout(ApiConfig.CONNECT_TIMEOUT, TimeUnit.SECONDS)
            .readTimeout(ApiConfig.READ_TIMEOUT, TimeUnit.SECONDS)
            .writeTimeout(ApiConfig.WRITE_TIMEOUT, TimeUnit.SECONDS)
            .build()
    }
    
    /**
     * Create Retrofit instance
     */
    fun createRetrofit(okHttpClient: OkHttpClient): Retrofit {
        return Retrofit.Builder()
            .baseUrl(ApiConfig.BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(MoshiConverterFactory.create(createMoshi()))
            .build()
    }
    
    /**
     * Create API service
     */
    inline fun <reified T> createApiService(
        noinline tokenProvider: () -> String? = { null }
    ): T {
        val okHttpClient = createOkHttpClient(tokenProvider)
        val retrofit = createRetrofit(okHttpClient)
        return retrofit.create(T::class.java)
    }
}
