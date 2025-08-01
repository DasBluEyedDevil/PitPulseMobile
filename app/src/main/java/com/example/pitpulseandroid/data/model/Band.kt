package com.example.pitpulseandroid.data.model

/**
 * Data class representing a music band or artist
 */
data class Band(
    val id: String,
    val name: String,
    val genre: String,
    val bio: String,
    val imageUrl: String,
    val formationYear: Int,
    val location: String,
    val rating: Float = 0f,
    val reviewCount: Int = 0,
    val genres: List<String> = listOf(),
    val nextShow: String = "",
    val members: List<BandMember> = emptyList(),
    val upcomingEvents: List<Event> = emptyList(),
    val socialLinks: List<Pair<String, String>> = listOf() // Format: (platform, url)
) {
    companion object {
        /**
         * Returns a list of sample bands for development and testing
         */
        fun getSampleBands(): List<Band> {
            return listOf(
                Band(
                    id = "b1",
                    name = "Electric Harmony",
                    genre = "Rock",
                    bio = "A four-piece band known for energetic performances",
                    imageUrl = "https://picsum.photos/id/1038/500/300",
                    formationYear = 2018,
                    location = "Brooklyn, NY",
                    rating = 4.7f,
                    reviewCount = 156,
                    genres = listOf("Rock", "Alternative", "Indie"),
                    nextShow = "Tonight at The Sound Garden",
                    socialLinks = listOf(
                        Pair("Instagram", "https://instagram.com/electricharmony"),
                        Pair("Twitter", "https://twitter.com/electricharmony"),
                        Pair("Spotify", "https://open.spotify.com/artist/electricharmony")
                    )
                ),
                Band(
                    id = "b2",
                    name = "Midnight Groove",
                    genre = "R&B",
                    bio = "Soul collective bringing back classic sounds with a modern twist",
                    imageUrl = "https://picsum.photos/id/1039/500/300",
                    formationYear = 2016,
                    location = "Queens, NY",
                    rating = 4.3f,
                    reviewCount = 98,
                    genres = listOf("R&B", "Soul", "Funk"),
                    nextShow = "Tomorrow at Electric Avenue",
                    socialLinks = listOf(
                        Pair("Instagram", "https://instagram.com/midnightgroove"),
                        Pair("YouTube", "https://youtube.com/midnightgroove")
                    )
                ),
                Band(
                    id = "b3",
                    name = "Cosmic Travelers",
                    genre = "Psychedelic",
                    bio = "Experimental space rock outfit pushing musical boundaries",
                    imageUrl = "https://picsum.photos/id/1040/500/300",
                    formationYear = 2020,
                    location = "Manhattan, NY",
                    rating = 4.9f,
                    reviewCount = 230,
                    genres = listOf("Psychedelic", "Space Rock", "Experimental"),
                    nextShow = "Sat at The Basement",
                    socialLinks = listOf(
                        Pair("Bandcamp", "https://cosmictravelers.bandcamp.com"),
                        Pair("Instagram", "https://instagram.com/cosmictravelers"),
                        Pair("SoundCloud", "https://soundcloud.com/cosmictravelers")
                    )
                )
            )
        }
    }
}

/**
 * Data class representing a band member
 */
data class BandMember(
    val id: String,
    val name: String,
    val role: String,
    val imageUrl: String = ""
)
