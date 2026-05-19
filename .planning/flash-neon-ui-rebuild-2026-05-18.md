# SoundCheck Flash-Neon UI Rebuild Execution Plan

## Target

Use `model1.png` and the May 17 flash assets as the canonical mobile visual direction: concert-poster backgrounds, bright cyan/magenta glows, waveform/equalizer motifs, dense poster cards, and a dark translucent app shell.

## Guardrails

- Preserve existing routes, providers, repositories, auth flow, persisted data, and backend contracts.
- Do not edit generated Dart files.
- Do not touch unrelated dirty Android config, root documentation/package changes, `mobile/store-assets/`, or unrelated web files.
- Keep all new visual work inside `mobile/assets/brand/flash/`, `AppTheme`, shared widgets, screen styling, and UI tests.

## Work Plan

1. Import the supplied flash source PNGs into `mobile/assets/brand/flash/source/`.
2. Generate app-ready flash variants with role-specific filenames and transparent wordmark/mark cutouts with alpha.
3. Register flash assets in `mobile/pubspec.yaml`.
4. Extend `AppTheme` with flash asset constants, brighter neon tokens, poster scrims, nav chrome, CTA gradients, and compatibility aliases.
5. Replace the restrained brand background implementation with stage-poster backgrounds and edge fades while keeping existing imports compiling.
6. Add reusable flash primitives: stage background, poster hero, neon glass panel, poster card, pulse/check-in CTA, bottom nav, waveform header, equalizer divider, stat tile, avatar stack, empty state, and skeleton.
7. Restyle auth/onboarding and shell navigation around wordmark imagery and a centered glowing SoundCheck action.
8. Restyle feed, discover, event/band/venue/profile, check-in, notification, wrapped, subscription, verification, and shared card/empty/loading states using the new primitives and asset roles.
9. Update tests that assert logo assets or old icon placeholders.
10. Verify with Flutter checks, debug APK build, harness check, and emulator screenshots where feasible.

## QA Failure Conditions

- Visible checkerboard backgrounds in bundled transparent assets.
- Repeated wordmark/mark stacks on the same screen.
- Generic music-note hero imagery where brand or poster art should be used.
- Text overflow, clipped hero art, unreadable contrast, bottom-nav overlap, or stale lime-heavy styling.
