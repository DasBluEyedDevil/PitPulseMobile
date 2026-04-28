# Exploration: Technical Consolidation and Launch Hardening

**Date:** 2026-03-09
**Mode:** Crystallize
**Decision:** Proceed to planning

---

## Crystallized Summary

SoundCheck has shipped four milestones (v1.0 through v3.0) totaling 170 requirements across 71 plans, but the codebase carries significant technical debt that increases maintenance cost and blocks production launch. The three largest debt items are: a legacy `reviews` table that runs in parallel with the modern `checkin_band_ratings` system (duplicating data and aggregate logic across 15 backend files), a 737-LOC CheckinCreatorService that maintains a legacy bandId+venueId check-in path alongside the event-first flow, and 10 pre-existing test failures that undermine CI confidence. Meanwhile, critical launch ops (secret rotation, production config, pending migrations) remain unaddressed.

This milestone consolidates all outstanding debt and launch-hardening work into a single sequential initiative. The `reviews` system will be fully eliminated -- its 2,412 LOC deleted, aggregate rating queries repointed to `checkin_band_ratings`, and the database tables dropped via migration. The CheckinCreatorService legacy path will be removed, dark color references cleaned up for light-mode readiness, and all failing tests fixed. Launch ops bookend the work so the codebase emerges both clean and production-ready.

---

## Milestone

**Name:** v4.0 -- Technical Consolidation and Launch Hardening
**Type:** Hybrid (debt paydown + launch hardening)
**Estimated Plans:** 8-11
**Execution Strategy:** Sequential safety-first -- each phase validates before the next begins

---

## Phase Breakdown

### Phase 1: Launch Ops Foundation (1-2 plans)
**Goal:** Production environment is correctly configured with rotated secrets.
- Rotate exposed secrets in Railway (DB password, JWT_SECRET, SetlistFM API key)
- Set NODE_ENV=production in Railway environment
- Configure third-party env vars (Sentry, Firebase, Resend, RevenueCat, R2)
- Run migration 039 (`replace-social-auth-sentinel`) against production DB
- Run `npm run seed:demo` against production DB

### Phase 2: Test Suite Green (1 plan)
**Goal:** CI passes with zero test failures.
- Fix 10 failing tests in CheckinService and UserService (UUID validation issues)
- Verify full test suite passes: `npm test`
- This phase gates all subsequent refactoring work

### Phase 3: Dark Color Cleanup (1 plan)
**Goal:** Zero `AppTheme.*Dark` references remain in mobile code.
- Remove 42 remaining `AppTheme.*Dark` references across 10 Dart files
- Replace with theme-aware equivalents (e.g., `Theme.of(context).colorScheme.*`)
- Run `flutter analyze` to verify no regressions

### Phase 4: CheckinCreator Legacy Removal (1-2 plans)
**Goal:** CheckinCreatorService contains only the event-first check-in flow.
- Remove legacy `createCheckin(bandId + venueId)` path (lines 219-346 of CheckinCreatorService.ts)
- Remove dual-write logic that populates old columns alongside new columns
- Update CheckinService facade to remove legacy delegation
- Verify mobile app exclusively uses event-first `createEventCheckin` flow before removing
- Update related tests

### Phase 5: Reviews System Consolidation (3-4 plans)
**Goal:** The `reviews` table and all associated code are eliminated; aggregates use `checkin_band_ratings`.
- **Plan 5a: Repoint aggregates** -- Update `VenueService.updateVenueRating()` and `BandService.updateBandRating()` to compute from `checkin_band_ratings` + `checkins.venue_rating` instead of `reviews` table
- **Plan 5b: Migrate owner responses** -- Move `owner_response` / `owner_response_at` functionality from ReviewService to checkin-level; update ClaimController to respond to checkins instead of reviews
- **Plan 5c: Delete review stack** -- Remove ReviewService.ts (583 LOC), ReviewController.ts (459 LOC), reviewRoutes.ts (30 LOC), 3 test files (1,340 LOC), mobile Review domain model (3 files). Update imports in index.ts, AdminController, DataExportService, UserService stats query, seed.ts
- **Plan 5d: Drop tables migration** -- Write migration to drop `reviews` and `review_helpfulness` tables. Compare aggregate outputs (old vs new) before finalizing

### Phase 6: Validation Sweep (1 plan)
**Goal:** Full confidence that nothing is broken.
- Run full backend test suite
- Run smoke tests
- Verify venue and band aggregate ratings compute correctly from new data source
- Verify admin dashboard stats work without `reviews` table
- Verify data export works without `reviews` table
- Run `flutter analyze` on mobile

---

## Files Impact

### Deleted (9 files, ~2,400 LOC)
| File | LOC | Reason |
|------|-----|--------|
| `backend/src/services/ReviewService.ts` | 583 | Entire service eliminated |
| `backend/src/controllers/ReviewController.ts` | 459 | Entire controller eliminated |
| `backend/src/routes/reviewRoutes.ts` | 30 | Route mount eliminated |
| `backend/src/__tests__/services/ReviewService.test.ts` | 669 | Tests for deleted service |
| `backend/src/__tests__/services/ReviewService.integration.test.ts` | 481 | Tests for deleted service |
| `backend/src/__tests__/validation/reviewValidation.test.ts` | 190 | Validation tests for deleted API |
| `mobile/lib/src/features/reviews/domain/review.dart` | ~27 | Domain model eliminated |
| `mobile/lib/src/features/reviews/domain/review.freezed.dart` | generated | Generated code |
| `mobile/lib/src/features/reviews/domain/review.g.dart` | generated | Generated code |

### Modified -- Backend (8 files)
| File | Change |
|------|--------|
| `backend/src/services/VenueService.ts` | Repoint `updateVenueRating()` from `reviews` to `checkin_band_ratings` |
| `backend/src/services/BandService.ts` | Repoint `updateBandRating()` from `reviews` to `checkin_band_ratings` |
| `backend/src/services/UserService.ts` | Remove `review_count` from stats query (line 311) |
| `backend/src/controllers/AdminController.ts` | Remove review count queries, review JOIN, review deletion |
| `backend/src/controllers/ClaimController.ts` | Repoint `respondToReview` to work on checkins |
| `backend/src/services/DataExportService.ts` | Remove `getReviews()` method or repoint to checkin data |
| `backend/src/index.ts` | Remove `reviewRoutes` import and mount |
| `backend/src/scripts/seed.ts` | Remove review seeding, update aggregate recomputation |

### Modified -- Mobile (~20 files for review refs + 10 files for dark colors)
- 10 Dart files: Remove 42 `AppTheme.*Dark` references
- ~20 Dart files: Remove imports/references to Review domain model, update any UI that displayed standalone reviews

### Created (1-2 files)
| File | Purpose |
|------|---------|
| `backend/migrations/040_drop-reviews-tables.ts` | Drop `reviews` and `review_helpfulness` tables |
| `backend/migrations/041_add-owner-response-to-checkins.ts` | Add `owner_response` columns to checkins table (if needed) |

---

## Key Risks and Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Aggregate ratings break after repointing queries | High | Phase 6 validation sweep; compare old vs new aggregate outputs before dropping table; run both in parallel during transition |
| Owner response feature lost during consolidation | Medium | Migrate `owner_response` / `owner_response_at` to checkins table before dropping reviews; verify ClaimController works end-to-end |
| Mobile app still uses legacy bandId+venueId check-in path | Medium | Audit mobile check-in flow to confirm event-first usage before removing legacy path in Phase 4 |
| Dart compile errors from stale Review model references | Medium | `flutter analyze` will catch all errors; freezed codegen will fail if dangling references remain |
| Secret rotation breaks Railway deployment | Low | Test with Railway preview environment first; have rollback plan for env vars |
| Existing review data lost | Low | No real user data exists yet (beta only with demo seed); data loss is acceptable pre-launch |

---

## Success Criteria

1. Zero failing tests (from 10 failing to 0)
2. `reviews` and `review_helpfulness` tables dropped via migration
3. All venue and band aggregate ratings computed from `checkin_band_ratings` + `checkins.venue_rating`
4. No `ReviewService`, `ReviewController`, or `/api/reviews` endpoint exists in codebase
5. No `AppTheme.*Dark` references remain in mobile code (from 42 to 0)
6. `CheckinCreatorService` contains only event-first flow (no legacy bandId+venueId path)
7. Railway production environment has rotated secrets, `NODE_ENV=production`, migration 039 applied
8. Full test suite and smoke tests pass

---

## Knowns

- Known: CheckinService facade is 327 LOC, sub-services total 1,402 LOC (extraction structurally done)
- Known: CheckinCreatorService legacy path is lines 219-346, clearly marked with comments
- Known: `reviews` table is fully parallel to `checkin_band_ratings` -- no data flows between them
- Known: VenueService and BandService aggregate queries read from `reviews`, not `checkin_band_ratings` (this is a bug)
- Known: `review_helpfulness` table is only referenced by ReviewService (3 files total)
- Known: `owner_response` columns only exist on `reviews` table (migration 036), not on `checkins`
- Known: 42 `AppTheme.*Dark` refs remain across 10 Dart files (down from 686 pre-v3.0)
- Known: 10 test failures are in CheckinService + UserService UUID validation
- Known: No real user data exists -- only demo seed data. Review data loss is a non-issue.
- Known: Mobile has a `features/reviews/domain/` directory with 3 files (model + freezed generated)
- Known: Sequential safety-first ordering chosen: ops -> tests -> colors -> CheckinCreator -> reviews -> validation

## Unknowns

- Unknown: Whether mobile app ever calls the legacy `createCheckin(bandId+venueId)` path -- needs audit before Phase 4
- Unknown: Whether `owner_response` should migrate to checkins table or be dropped entirely -- needs product decision in Phase 5
- Unknown: Exact scope of AdminController changes -- review counts may need replacement with checkin-based equivalents or removal
- Unknown: Whether any third-party integrations or webhooks depend on `/api/reviews` endpoints
- Unknown: Railway preview environment availability for testing secret rotation safely

---

## Decision

**Proceed to planning.** The initiative is crystallized with clear phases, identified risks, and measurable success criteria. Ready for `/legion:start` or `/legion:milestone` to generate formal plans for v4.0 -- Technical Consolidation and Launch Hardening.
