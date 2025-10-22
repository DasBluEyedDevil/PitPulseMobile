package com.example.pitpulseandroid.ui.components

import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextFieldDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.example.pitpulseandroid.ui.theme.PitPulseAndroidTheme
import com.example.pitpulseandroid.ui.theme.Purple600

/**
 * A search bar component for searching venues, bands, etc.
 * 
 * @param onSearch Callback when search is submitted
 * @param modifier Modifier to be applied to the search bar
 * @param placeholder Placeholder text to display when empty
 * @param initialValue Initial value for the search field
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SearchBarComponent(
    onSearch: (String) -> Unit = {},
    modifier: Modifier = Modifier,
    placeholder: String = "Search venues, bands, events...",
    initialValue: String = ""
) {
    var searchText by remember { mutableStateOf(initialValue) }

    val accent = Purple600
    val neutral = MaterialTheme.colorScheme.onSurfaceVariant

    OutlinedTextField(
        value = searchText,
        onValueChange = { 
            searchText = it
            onSearch(it)
        },
        placeholder = { Text(placeholder) },
        leadingIcon = {
            Icon(
                imageVector = Icons.Default.Search,
                contentDescription = "Search",
                tint = accent
            )
        },
        modifier = modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp),
        shape = RoundedCornerShape(24.dp),
        colors = TextFieldDefaults.colors(
            focusedIndicatorColor = accent,
            unfocusedIndicatorColor = neutral.copy(alpha = 0.5f),
            cursorColor = accent,
            focusedContainerColor = androidx.compose.ui.graphics.Color.Transparent,
            unfocusedContainerColor = androidx.compose.ui.graphics.Color.Transparent
        ),
        singleLine = true
    )
}

@Preview(showBackground = true)
@Composable
fun SearchBarComponentPreview() {
    PitPulseAndroidTheme {
        SearchBarComponent(
            modifier = Modifier.padding(16.dp)
        )
    }
}
