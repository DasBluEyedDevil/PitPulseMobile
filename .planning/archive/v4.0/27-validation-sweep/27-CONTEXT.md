# Phase 27: Validation Sweep -- Context

## Phase Goal
Full confidence that all changes are correct and nothing is broken.

## Requirements Covered
- `VAL-01`: Full test suite, smoke tests, aggregate verification, and `flutter analyze` all pass after all changes.

## What Was Changed in Phases 23-26
- Phase 23: Fixed 10 failing tests (UserService + CheckinService UUID validation)
- Phase 24: Replaced 253 AppTheme.*Dark references with Theme.of(context) across 50 mobile files
- Phase 25: Removed legacy createCheckin(bandId+venueId) path from CheckinCreatorService, facade, controller
- Phase 26: Eliminated entire reviews system — repointed ratings, deleted ReviewService/Controller/routes, dropped tables via migration 043

## Key Verification Points
1. Backend test suite: must pass with zero failures
2. Smoke tests: health endpoint, auth rejection, feed auth guard
3. Aggregate ratings: VenueService/BandService now compute from checkin_band_ratings/checkins.venue_rating
4. Admin/export/claim: no references to dropped reviews table
5. Codebase sweep: no orphaned review/legacy references
6. flutter analyze: deferred (hangs in this environment) — note as known limitation

## Plan Structure
- **Plan 27-01 (Wave 1)**: Full test suite, smoke tests, aggregate verification, orphan sweep. Agent: `Senior Developer`.
