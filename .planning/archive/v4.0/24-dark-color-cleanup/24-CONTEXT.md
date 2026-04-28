# Phase 24: Dark Color Cleanup -- Context

## Phase Goal
Zero `AppTheme.*Dark` references remain in mobile code, unblocking light mode.

## Requirements Covered
- `THEME-01`: Zero `AppTheme.*Dark` references remain in mobile code; all replaced with theme-aware equivalents.

## What Already Exists
- `mobile/lib/src/core/theme/app_theme.dart` defines 4 static Dark color constants:
  - `backgroundDark` = Color(0xFF0D0F11) — very deep slate, used for scaffold/screen backgrounds
  - `surfaceDark` = Color(0xFF161B22) — gunmetal, used for bottom sheets/dialogs
  - `surfaceVariantDark` = Color(0xFF21262D) — borders/inputs
  - `cardDark` = Color(0xFF1C2128) — card backgrounds
- Also has 2 aliases: `background = backgroundDark`, `surfaceVariant = surfaceVariantDark`
- The `darkTheme` ThemeData already defines `scaffoldBackgroundColor: backgroundDark` and `ColorScheme.dark(surface: surfaceDark, ...)`
- 253 total references across 47 files in 19 feature directories
- `Theme.of(context)` text themes are already used extensively (50+ instances)
- Only 1 existing `colorScheme` usage (badge_collection_screen.dart)
- v3.0 already cleaned up some references (down from originally estimated 686)

## Color Reference Distribution
- `backgroundDark`: 93 references (36.8%) — 47 files
- `cardDark`: 80 references (31.6%) — spread across cards and containers
- `surfaceVariantDark`: 57 references (22.5%) — inputs, borders, dividers
- `surfaceDark`: 23 references (9.1%) — sheets, dialogs, elevated surfaces

## Top Files by Reference Count
1. `checkin_screen.dart` (33), `profile_screen.dart` (24), `discover_screen.dart` (20)
2. `venue_detail_screen.dart` (16), `checkin_detail_screen.dart` (16)
3. `feed_screen.dart` (12), `band_detail_screen.dart` (11)

## Key Design Decisions
- Map `backgroundDark` → `Theme.of(context).scaffoldBackgroundColor` (already set in darkTheme)
- Map `cardDark` → `Theme.of(context).colorScheme.surfaceContainerHigh` (closest M3 equivalent)
- Map `surfaceVariantDark` → `Theme.of(context).colorScheme.surfaceContainerHighest` (for inputs/borders)
- Map `surfaceDark` → `Theme.of(context).colorScheme.surface` (already mapped in ColorScheme.dark)
- Update ColorScheme in darkTheme to include `surfaceContainerHigh` and `surfaceContainerHighest` using the exact same hex values to avoid visual regressions
- Remove the 4 static Dark constants and 2 aliases from AppTheme after all references are migrated
- Architecture proposals: skipped — this is mechanical replacement work
- Spec pipeline: skipped — scope fully defined by grep results

## Plan Structure
- **Plan 24-01 (Wave 1)**: Update app_theme.dart infrastructure, replace all 253 references across 47 files, verify zero remaining. Agent: `Frontend Developer`.
