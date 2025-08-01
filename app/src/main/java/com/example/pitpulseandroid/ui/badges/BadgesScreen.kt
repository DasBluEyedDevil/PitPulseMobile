package com.example.pitpulseandroid.ui.badges

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Card
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.example.pitpulseandroid.data.model.Badge
import com.example.pitpulseandroid.data.model.BadgeProgress
import com.example.pitpulseandroid.ui.theme.PitPulseAndroidTheme
import kotlin.random.Random

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BadgesScreen(
    onBackClick: () -> Unit
) {
    var selectedTabIndex by remember { mutableStateOf(0) }
    val tabs = listOf("All Badges", "Earned", "In Progress")

    // In a real app, these would come from a repository
    val allBadges = Badge.getSampleBadges()
    val badgeProgress = remember {
        allBadges.map { badge ->
            val currentValue = Random.nextInt(0, badge.threshold * 2)
            BadgeProgress(
                badge = badge,
                currentValue = currentValue,
                isEarned = currentValue >= badge.threshold,
                percentComplete = (currentValue.toFloat() / badge.threshold).coerceAtMost(1f) * 100f
            )
        }
    }

    val filteredBadges = when (selectedTabIndex) {
        1 -> badgeProgress.filter { it.isEarned }
        2 -> badgeProgress.filter { !it.isEarned }
        else -> badgeProgress
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Badges") },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Back"
                        )
                    }
                }
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            TabRow(selectedTabIndex = selectedTabIndex) {
                tabs.forEachIndexed { index, title ->
                    Tab(
                        text = { Text(title) },
                        selected = selectedTabIndex == index,
                        onClick = { selectedTabIndex = index }
                    )
                }
            }

            if (filteredBadges.isEmpty()) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = if (selectedTabIndex == 1) "No badges earned yet" else "No badges in progress",
                        style = MaterialTheme.typography.bodyLarge,
                        textAlign = TextAlign.Center
                    )
                }
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    items(filteredBadges) { progress ->
                        BadgeItem(progress = progress)
                    }
                }
            }
        }
    }
}

@Composable
fun BadgeItem(progress: BadgeProgress) {
    val badge = progress.badge
    val tierColor = when (badge.tier) {
        1 -> Color(0xFFCD7F32) // Bronze
        2 -> Color(0xFFC0C0C0) // Silver
        3 -> Color(0xFFFFD700) // Gold
        else -> MaterialTheme.colorScheme.primary
    }

    Card(
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Badge icon
            Box(
                modifier = Modifier
                    .size(60.dp)
                    .clip(CircleShape)
                    .background(Color.LightGray.copy(alpha = 0.3f))
                    .border(2.dp, tierColor, CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = badge.name.take(1),
                    style = MaterialTheme.typography.headlineMedium,
                    color = tierColor
                )
            }

            Spacer(modifier = Modifier.width(16.dp))

            Column(
                modifier = Modifier.weight(1f)
            ) {
                Text(
                    text = badge.name,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )

                Text(
                    text = badge.description,
                    style = MaterialTheme.typography.bodyMedium
                )

                Spacer(modifier = Modifier.height(8.dp))

                if (progress.isEarned) {
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(4.dp))
                            .background(MaterialTheme.colorScheme.primaryContainer)
                            .padding(horizontal = 8.dp, vertical = 4.dp)
                    ) {
                        Text(
                            text = "Earned!",
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.onPrimaryContainer
                        )
                    }
                } else {
                    Column {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(
                                text = "Progress: ${progress.currentValue}/${badge.threshold}",
                                style = MaterialTheme.typography.bodySmall
                            )
                            Text(
                                text = "${progress.percentComplete.toInt()}%",
                                style = MaterialTheme.typography.bodySmall
                            )
                        }

                        Spacer(modifier = Modifier.height(4.dp))

                        LinearProgressIndicator(
                            modifier = Modifier.fillMaxWidth(),
                            progress = { progress.percentComplete / 100f }
                        )
                    }
                }
            }
        }
    }
}

@Preview(showBackground = true)
@Composable
fun BadgesScreenPreview() {
    PitPulseAndroidTheme {
        BadgesScreen(
            onBackClick = {}
        )
    }
}
