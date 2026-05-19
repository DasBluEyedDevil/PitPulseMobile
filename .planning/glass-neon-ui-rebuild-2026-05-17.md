# Glass-Neon UI Rebuild - 2026-05-17

## Scope

Refresh the Flutter mobile UI around the supplied SoundCheck logo and mark images. Preserve app behavior, routes, API contracts, auth flow, persistence, and generated model files.

## Implementation Order

1. Bundle the supplied source images under `mobile/assets/brand/source/`, generate stable app-size variants under `mobile/assets/brand/`, and register the asset tree in `mobile/pubspec.yaml`.
2. Replace the dark theme palette with a glass-neon system while keeping legacy `AppTheme` aliases mapped to the new tokens for compatibility.
3. Add shared brand widgets for image logo usage, atmospheric backgrounds, glass panels, neon buttons/chips, branded placeholders, and updated empty/error/skeleton states.
4. Migrate visible screen surfaces across auth, onboarding, shell navigation, feed, discover/search/map, check-in, profile, notifications, badges, sharing, wrapped, subscription, verification, bands, venues, events, and filters.
5. Update UI tests that intentionally depend on old logo/icon expectations and run mobile plus harness verification.

## Acceptance Criteria

- No backend contracts, routes, repository calls, auth logic, generated Dart files, or Android build configuration are changed.
- The supplied images are bundled and referenced through `Image.asset`.
- The shipped dark UI uses deep stage-black backgrounds, cyan/magenta/violet glow accents, glass-like surfaces, and branded placeholders.
- `flutter analyze`, `flutter test`, and `npm run harness:check` are run or any blockers are documented with exact commands and output.
