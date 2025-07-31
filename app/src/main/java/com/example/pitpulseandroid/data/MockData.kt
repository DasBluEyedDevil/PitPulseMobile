package com.example.pitpulseandroid.data

import com.example.pitpulseandroid.data.model.Badge
import com.example.pitpulseandroid.data.model.Band
import com.example.pitpulseandroid.data.model.Review
import com.example.pitpulseandroid.data.model.User
import com.example.pitpulseandroid.data.model.Venue

/**
 * Mock data for the app.
 */
object MockData {
    
    // Mock venues
    val venues = listOf(
        Venue(
            id = "v1",
            name = "The Fillmore",
            image = "placeholder",
            rating = 4.7,
            reviewCount = 342,
            address = "1805 Geary Blvd, San Francisco, CA",
            distance = "0.8 mi",
            amenities = listOf("Parking", "Food & Drinks", "Accessible"),
            ratings = mapOf(
                "Sound Quality" to 4.8,
                "Atmosphere" to 4.9,
                "Staff" to 4.5,
                "Value" to 4.2
            )
        ),
        Venue(
            id = "v2",
            name = "Great American Music Hall",
            image = "placeholder",
            rating = 4.5,
            reviewCount = 218,
            address = "859 O'Farrell St, San Francisco, CA",
            distance = "1.2 mi",
            amenities = listOf("Food & Drinks", "Accessible"),
            ratings = mapOf(
                "Sound Quality" to 4.6,
                "Atmosphere" to 4.7,
                "Staff" to 4.4,
                "Value" to 4.3
            )
        ),
        Venue(
            id = "v3",
            name = "The Independent",
            image = "placeholder",
            rating = 4.6,
            reviewCount = 187,
            address = "628 Divisadero St, San Francisco, CA",
            distance = "1.5 mi",
            amenities = listOf("Parking", "Food & Drinks"),
            ratings = mapOf(
                "Sound Quality" to 4.7,
                "Atmosphere" to 4.5,
                "Staff" to 4.6,
                "Value" to 4.4
            )
        )
    )
    
    // Mock bands
    val bands = listOf(
        Band(
            id = "b1",
            name = "Radiohead",
            image = "placeholder",
            rating = 4.9,
            reviewCount = 1245,
            genre = "Alternative Rock",
            bio = "Radiohead are an English rock band formed in Abingdon, Oxfordshire, in 1985. The band consists of Thom Yorke, brothers Jonny Greenwood and Colin Greenwood, Ed O'Brien and Philip Selway.",
            performanceRatings = mapOf(
                "Live Performance" to 4.9,
                "Crowd Engagement" to 4.7,
                "Setlist" to 4.8,
                "Sound Quality" to 4.9
            )
        ),
        Band(
            id = "b2",
            name = "The Killers",
            image = "placeholder",
            rating = 4.8,
            reviewCount = 987,
            genre = "Indie Rock",
            bio = "The Killers are an American rock band formed in Las Vegas in 2001 by Brandon Flowers and Dave Keuning. The band's membership expanded to include Mark Stoermer and Ronnie Vannucci Jr.",
            performanceRatings = mapOf(
                "Live Performance" to 4.8,
                "Crowd Engagement" to 4.9,
                "Setlist" to 4.7,
                "Sound Quality" to 4.8
            )
        ),
        Band(
            id = "b3",
            name = "Arctic Monkeys",
            image = "placeholder",
            rating = 4.8,
            reviewCount = 876,
            genre = "Indie Rock",
            bio = "Arctic Monkeys are an English rock band formed in Sheffield in 2002. The group consists of Alex Turner, Jamie Cook, Nick O'Malley, and Matt Helders.",
            performanceRatings = mapOf(
                "Live Performance" to 4.8,
                "Crowd Engagement" to 4.6,
                "Setlist" to 4.7,
                "Sound Quality" to 4.8
            )
        )
    )
    
    // Mock reviews
    val reviews = listOf(
        Review(
            id = "r1",
            username = "musiclover42",
            avatar = "placeholder",
            date = "2023-10-15",
            rating = 5,
            content = "Amazing venue! The sound quality was perfect and the staff were super friendly. Will definitely be coming back for more shows.",
            likes = 24
        ),
        Review(
            id = "r2",
            username = "concertgoer",
            avatar = "placeholder",
            date = "2023-10-10",
            rating = 4,
            content = "Great atmosphere and good sound. Drinks were a bit expensive but overall a good experience.",
            likes = 12
        ),
        Review(
            id = "r3",
            username = "rockfan92",
            avatar = "placeholder",
            date = "2023-10-05",
            rating = 5,
            content = "One of the best venues in the city. The acoustics are incredible and the lighting setup really enhances the experience.",
            likes = 31
        )
    )
    
    // Mock badges
    val badges = listOf(
        Badge(
            name = "Night Owl",
            description = "Attended 5 shows that started after 10pm",
            icon = "🦉"
        ),
        Badge(
            name = "Globetrotter",
            description = "Review venues in 5 different cities",
            icon = "🌎"
        ),
        Badge(
            name = "Genre Explorer",
            description = "Review bands from 10 different genres",
            icon = "🎸"
        ),
        Badge(
            name = "Hot Streak",
            description = "Attend 3 shows in one week",
            icon = "🔥"
        )
    )
    
    // Mock user
    val currentUser = User(
        username = "rockfan92",
        level = 12,
        reviewCount = 47,
        badgeCount = 15,
        badges = badges
    )
}