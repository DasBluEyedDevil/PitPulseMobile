# Phase 26: Reviews System Consolidation -- Context

## Phase Goal
The `reviews` table and all associated code eliminated; aggregates use `checkin_band_ratings`.

## Requirements Covered
- `DEBT-02`: Venue and band aggregate ratings computed from `checkin_band_ratings` + `checkins.venue_rating` (not from `reviews` table)
- `DEBT-03`: ReviewService, ReviewController, `/api/reviews` endpoint, and all review test files deleted from codebase
- `DEBT-04`: `reviews` and `review_helpfulness` database tables dropped via migration

## What Already Exists

### Backend Files to DELETE
- `backend/src/services/ReviewService.ts` — 10 public methods, 546+ lines
- `backend/src/controllers/ReviewController.ts` — 10 handlers
- `backend/src/routes/reviewRoutes.ts` — 10 route registrations
- `backend/src/__tests__/services/ReviewService.test.ts`
- `backend/src/__tests__/services/ReviewService.integration.test.ts`

### Backend Files to MODIFY
- `backend/src/services/VenueService.ts` — `updateVenueRating()` currently reads from `reviews` table → rewrite to use `checkins.venue_rating`
- `backend/src/services/BandService.ts` — `updateBandRating()` currently reads from `reviews` table → rewrite to use `checkin_band_ratings`
- `backend/src/controllers/AdminController.ts` — 6 direct SQL queries on `reviews` table (stats, counts, joins, deletes)
- `backend/src/services/DataExportService.ts` — exports user reviews
- `backend/src/controllers/ClaimController.ts` — `respondToReview()` calls ReviewService
- `backend/src/routes/claimRoutes.ts` — route for POST /api/claims/reviews/:reviewId/respond
- `backend/src/index.ts` — `app.use('/api/reviews', reviewRoutes)` line
- `backend/src/types/index.ts` — Review, CreateReviewRequest, ReviewHelpfulness, OwnerReviewResponse interfaces
- `backend/src/scripts/seed.ts` — review seeding logic

### Mobile Files to DELETE
- `mobile/lib/src/features/reviews/` — entire directory (review.dart, review.freezed.dart, review.g.dart)

### Mobile Files to MODIFY
- `mobile/lib/src/features/verification/data/claim_repository.dart` — remove respondToReview(), getVenueReviews()
- `mobile/lib/src/features/verification/presentation/providers/claim_providers.dart` — remove venueReviewsProvider
- `mobile/lib/src/features/verification/presentation/widgets/owner_response_bottom_sheet.dart` — delete or gut

### Current Aggregate Rating Queries
- VenueService: `AVG(rating) FROM reviews WHERE venue_id = $1` → needs to become `AVG(venue_rating) FROM checkins WHERE venue_id = $1 AND venue_rating IS NOT NULL`
- BandService: `AVG(rating) FROM reviews WHERE band_id = $1` → needs to become `AVG(rating) FROM checkin_band_ratings WHERE band_id = $1`

## Key Design Decisions
- Sequential wave execution: migrate ratings (26-01) → delete review stack (26-02) → drop tables + cleanup (26-03)
- Owner response feature removed entirely (not migrated to checkin level — insufficient usage to justify)
- Admin stats that counted reviews will count checkins instead
- DataExportService review export removed (checkin data already exported separately)
- Review seeding removed from seed.ts
- Architecture proposals: skipped — clear removal scope
- Spec pipeline: skipped — fully mapped by exploration

## Plan Structure
- **Plan 26-01 (Wave 1)**: Rewrite VenueService/BandService aggregate ratings. Agent: `Backend Architect`.
- **Plan 26-02 (Wave 2)**: Delete ReviewService, ReviewController, routes, tests, types. Agent: `Senior Developer`.
- **Plan 26-03 (Wave 3)**: Drop tables migration, AdminController, DataExportService, seed.ts, mobile cleanup. Agent: `Senior Developer`.
