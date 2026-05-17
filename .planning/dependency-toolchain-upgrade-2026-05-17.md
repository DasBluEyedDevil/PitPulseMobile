# Dependency and Toolchain Upgrade - 2026-05-17

## Goal

Bring SoundCheck to the highest valid stable dependency and toolchain stack without dependency overrides, prerelease runtime targets, or behavior changes unrelated to required migrations.

## Baseline Before Edits

Worktree before this artifact:

- `mobile/pubspec.lock` already modified by dependency resolution.

Commands run before tracked edits:

- `npm run harness:check` - passed.
- `npm run lint --prefix backend` - passed with existing warning backlog.
- `npm run typecheck --prefix backend` - passed.
- `npm test --prefix backend` - failed before upgrades with Jest worker OOM/SIGTERM. 19 suites passed, 11 failed due worker termination.
- `npm run build --prefix backend` - passed.
- `flutter pub outdated --json` - completed; many mobile packages outdated or blocked by constraints.
- `flutter analyze` - failed on one warning: Sentry `attachViewHierarchy` experimental member use.
- `flutter test` - failed before upgrades on `shaders/ink_sparkle.frag` runtime stage format errors in widget tap tests.
- `flutter doctor -v` - passed on local Flutter 3.41.9 / Dart 3.11.5, Android SDK 36.0.0, Android Studio JBR 21.0.10.

## Target Policy

- Production Node target: Node 24 LTS, not Node 25/26 Current.
- Flutter target: latest stable Flutter available in the implementation environment, currently 3.41.9.
- Android target attempt: AGP 9.2.0, Gradle 9.4.1, Kotlin 2.3.20, with fallback to the highest passing stable stack if Flutter/Android plugin compatibility blocks it.
- Package policy: use latest stable versions that resolve under the chosen SDKs; do not add `dependency_overrides`.

## Known Mobile Blockers To Re-check

- `latlong2` 0.10.x is blocked while `flutter_map` 8.3.x requires `latlong2` 0.9.x.
- `json_serializable` 6.14.x and `mockito` 5.6.5 are blocked by analyzer/meta constraints under the current Flutter SDK and Riverpod generator stack.
- `package_info_plus` 10.x and `share_plus` 13.x are blocked by the current geolocator Linux dependency chain unless that chain moves.

## Verification Notes

Final verification should record:

- Backend lint, typecheck, tests, and build.
- Mobile code generation, analyzer, tests, and Android debug APK build.
- Repo harness and full check, or exact residual blockers if any gate remains invalid upstream.
- Final `flutter pub outdated` / `npm outdated` blockers.
