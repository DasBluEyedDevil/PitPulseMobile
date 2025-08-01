package com.example.pitpulseandroid.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.example.pitpulseandroid.data.model.Badge
import com.example.pitpulseandroid.data.model.User
import com.example.pitpulseandroid.ui.theme.PitPulseAndroidTheme
import com.example.pitpulseandroid.ui.theme.Purple600
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Star

/**
 * A card component that displays user statistics.
 * 
 * @param user The user whose stats to display
 * @param modifier Modifier to be applied to the card
 * @param onClick Callback when the card is clicked
 */
@Composable
fun UserStatsCard(
    modifier: Modifier = Modifier,
    user: User,
    onClick: (User) -> Unit = {}
) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .clickable { onClick(user) },
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            // User info row
            Row(
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Avatar
                AvatarComponent(
                    imageUrl = "",
                    fallbackText = user.username,
                    size = 48.dp
                )
                
                Spacer(modifier = Modifier.width(12.dp))
                
                // User details
                Column {
                    Text(
                        text = user.username,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    
                    Text(
                        text = "Level ${user.level}",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.primary
                    )
                }
            }
            
            Spacer(modifier = Modifier.height(16.dp))
            HorizontalDivider()
            Spacer(modifier = Modifier.height(16.dp))
            
            // Stats row
            Row(
                modifier = Modifier.fillMaxWidth()
            ) {
                // Reviews stat
                StatItem(
                    value = user.reviewCount.toString(),
                    label = "Reviews",
                    modifier = Modifier.weight(1f)
                )
                
                // Badges stat
                StatItem(
                    value = user.badgeCount.toString(),
                    label = "Badges",
                    modifier = Modifier.weight(1f)
                )
            }
            
            Spacer(modifier = Modifier.height(16.dp))
            
            // Recent badge (if any)
            if (user.badges.isNotEmpty()) {
                val recentBadge = user.badges.first()
                RecentBadgeItem(badge = recentBadge)
            }
        }
    }
}

@Composable
private fun StatItem(
    value: String,
    label: String,
    modifier: Modifier = Modifier
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = modifier
    ) {
        Text(
            text = value,
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold
        )
        Text(
            text = label,
            style = MaterialTheme.typography.bodyMedium,
            color = Color.Gray
        )
    }
}

@Composable
private fun RecentBadgeItem(
    badge: Badge,
    modifier: Modifier = Modifier
) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .background(MaterialTheme.colorScheme.surfaceVariant)
            .padding(12.dp)
    ) {
        // Badge icon
        Box(
            contentAlignment = Alignment.Center,
            modifier = Modifier
                .size(40.dp)
                .clip(CircleShape)
                .background(Purple600)
        ) {
            // Using an Icon component instead of directly referencing the icon
            androidx.compose.material3.Icon(
                imageVector = Icons.Filled.Star,
                contentDescription = "Badge icon",
                tint = Color.White
            )
        }
        
        Spacer(modifier = Modifier.width(12.dp))
        
        // Badge details
        Column {
            Text(
                text = "New Badge: ${badge.name}",
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Bold
            )
            
            Text(
                text = badge.description,
                style = MaterialTheme.typography.bodySmall
            )
        }
    }
}

@Preview(showBackground = true)
@Composable
fun UserStatsCardPreview() {
    PitPulseAndroidTheme {
        UserStatsCard(
            user = User(
                id = "user123",
                username = "rockfan92",
                email = "rockfan92@example.com",
                level = 12,
                reviewCount = 47,
                badgeCount = 15,
                badges = listOf(
                    Badge(
                        id = "badge123",
                        name = "Night Owl",
                        description = "Attended 5 shows that started after 10pm",
                        imageUrl = "",
                        icon = android.R.drawable.ic_dialog_info, // Using a public system icon instead
                        badgeType = com.example.pitpulseandroid.data.model.BadgeType.SPECIAL_EVENT,
                        threshold = 5
                    )
                )
            ),
            modifier = Modifier.padding(16.dp)
        )
    }
}