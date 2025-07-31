package com.example.pitpulseandroid.ui.bands

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import com.example.pitpulseandroid.data.model.Band
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

class BandDetailViewModel(private val bandId: String) : ViewModel() {
    // Mock data for band details
    private val bandsMap = mapOf(
        "b1" to Band(
            id = "b1",
            name = "Electric Harmony",
            image = "https://picsum.photos/id/1038/1000/600",
            rating = 4.7,
            reviewCount = 156,
            genres = listOf("Rock", "Alternative", "Indie", "Progressive", "Experimental"),
            bio = "Electric Harmony is a dynamic 4-piece rock band known for their energetic live performances and innovative sound. Formed in 2018, they quickly gained a following in the Brooklyn underground scene before breaking through to wider recognition with their debut EP 'Voltage'. Their music blends alternative rock with experimental elements and thought-provoking lyrics.",
            upcomingShows = listOf(
                "Tonight at The Sound Garden",
                "July 5 at The Basement",
                "July 15 at Mercury Lounge"
            )
        ),
        "b2" to Band(
            id = "b2",
            name = "Midnight Groove",
            image = "https://picsum.photos/id/1039/1000/600",
            rating = 4.3,
            reviewCount = 98,
            genres = listOf("R&B", "Soul", "Funk", "Neo-Soul", "Jazz Fusion"),
            bio = "Midnight Groove brings the soul back to modern music with their unique blend of R&B, funk, and neo-soul. This 5-piece outfit, led by the captivating vocals of Maya Rivers, creates music that moves both body and spirit. Their smooth basslines, tight horn section, and infectious rhythms have made them a staple in the NYC soul scene.",
            upcomingShows = listOf(
                "Tomorrow at Electric Avenue",
                "July 8 at Blue Note Jazz Club",
                "July 20 at SOB's"
            )
        ),
        "b3" to Band(
            id = "b3",
            name = "Cosmic Travelers",
            image = "https://picsum.photos/id/1040/1000/600",
            rating = 4.9,
            reviewCount = 230,
            genres = listOf("Psychedelic", "Space Rock", "Experimental", "Progressive", "Electronic"),
            bio = "Cosmic Travelers take audiences on a journey through sound and space with their immersive psychedelic rock experiences. This experimental collective, consisting of 6 core members and various collaborators, creates sprawling sonic landscapes that blur the boundaries between rock, electronic, and ambient music. Their live shows are legendary for their improvisation and visual elements.",
            upcomingShows = listOf(
                "Saturday at The Basement",
                "July 12 at Brooklyn Steel",
                "July 25 at House of Yes"
            )
        ),
        "b4" to Band(
            id = "b4",
            name = "Urban Pulse",
            image = "https://picsum.photos/id/1043/1000/600",
            rating = 4.5,
            reviewCount = 120,
            genres = listOf("Hip Hop", "Rap", "Urban", "Trap", "Alternative Hip Hop"),
            bio = "Urban Pulse represents the new wave of conscious hip hop, combining hard-hitting beats with insightful lyrics about city life and social issues. The group consists of two MCs and a DJ/producer who craft authentic stories from their experiences growing up in Brooklyn. Their mixtape 'City Rhythms' gained critical acclaim for its raw portrayal of urban reality.",
            upcomingShows = listOf(
                "Friday at Electric Avenue",
                "July 10 at Elsewhere",
                "July 18 at Rough Trade"
            )
        ),
        "b5" to Band(
            id = "b5",
            name = "Velvet Sound",
            image = "https://picsum.photos/id/1044/1000/600",
            rating = 4.6,
            reviewCount = 175,
            genres = listOf("Jazz", "Blues", "Swing", "Bebop", "Fusion"),
            bio = "Velvet Sound revives the golden age of jazz with a modern twist. This sophisticated ensemble features piano, upright bass, drums, saxophone, and trumpet, creating a rich tapestry of sound that pays homage to the jazz traditions while pushing the genre forward. Their intimate performances at Harmony Hall have become a Sunday institution for jazz aficionados in the city.",
            upcomingShows = listOf(
                "Sunday at Harmony Hall",
                "July 7 at Village Vanguard",
                "July 14 at Jazz Standard"
            )
        )
    )

    private val _band = MutableStateFlow<Band?>(bandsMap[bandId])
    val band: StateFlow<Band?> = _band

    class Factory(private val bandId: String) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T {
            if (modelClass.isAssignableFrom(BandDetailViewModel::class.java)) {
                return BandDetailViewModel(bandId) as T
            }
            throw IllegalArgumentException("Unknown ViewModel class")
        }
    }
}
