# Phase 25: CheckinCreator Legacy Removal -- Context

## Phase Goal
CheckinCreatorService contains only the event-first check-in flow.

## Requirements Covered
- `DEBT-01`: CheckinCreatorService contains only event-first flow — legacy `createCheckin(bandId + venueId)` path and dual-write logic removed.

## What Already Exists

### Backend
- `backend/src/services/checkin/CheckinCreatorService.ts` (737 lines):
  - `createEventCheckin()` (lines 67-216) — the event-first flow to KEEP
  - `createCheckin()` (lines 231-360) — the LEGACY flow to REMOVE. Has dual-write logic inserting both old columns (band_id, venue_id, rating) and new columns (event_id, venue_rating). Also calls `findOrCreateEvent()` and writes to `checkin_band_ratings`.
  - `deleteCheckin()` (lines 369-424) — KEEP (works for both flows)
  - Private helpers: verifyLocation, haversineDistance, isWithinTimeWindow, addVibeTagsToCheckin, invalidateFeedCachesForCheckin, publishCheckinAndNotify — all KEEP

- `backend/src/services/CheckinService.ts` — facade:
  - `createEventCheckin()` (lines 92-94) — delegates to creatorService, KEEP
  - `createCheckin()` (lines 99-101) — delegates to legacy path, REMOVE

- `backend/src/controllers/CheckinController.ts`:
  - `createCheckin()` handler (lines 20-119) — detects request format:
    - If `eventId` present → calls `createEventCheckin()` (line 51)
    - If no `eventId` → calls legacy `createCheckin()` with bandId+venueId (line 81)
  - Legacy path detection (lines 70-104) needs removal; require eventId always

- `backend/src/routes/checkinRoutes.ts`:
  - Single endpoint: `POST /api/checkins` (line 22) — no change needed

- `backend/src/__tests__/controllers/CheckinController.test.ts`:
  - Tests legacy path with `{ venueId, bandId, rating, comment, eventDate }`
  - Needs updating to test event-first only

### Mobile
- `mobile/lib/src/features/checkins/data/checkin_repository.dart`:
  - `createCheckIn(CreateCheckInRequest)` (lines 80-91) — legacy method
  - `createEventCheckIn()` (lines 143-164) — event-first method
  - Both call `POST /api/checkins` but with different request bodies

- `mobile/lib/src/features/checkins/domain/checkin.dart`:
  - `CreateCheckInRequest` sealed class — has both `eventId` and optional `bandId`/`venueId` fields

### Database
- `checkins` table has BOTH old columns (band_id, venue_id, rating, comment, photo_url, event_date) and new columns (event_id, venue_rating, review_text, image_urls, is_verified)
- `checkin_band_ratings` table — actively used by QueryService, RatingService, StatsService, WrappedService
- No schema changes needed for this phase (old columns stay for backward compat)

## Key Design Decisions
- Remove `createCheckin()` legacy method from CheckinCreatorService (~130 lines)
- Remove `createCheckin()` facade from CheckinService
- Simplify CheckinController to require `eventId` always, return 400 without it
- Remove legacy `createCheckIn()` from mobile repository, keep `createEventCheckIn()`
- Do NOT drop old database columns — that's Phase 26's scope
- Do NOT modify CheckinQueryService, CheckinRatingService, or other services that READ from these tables
- Architecture proposals: skipped — clear removal scope
- Spec pipeline: skipped — already fully mapped by exploration

## Plan Structure
- **Plan 25-01 (Wave 1)**: Mobile audit + backend legacy removal + test update. Agent: `Backend Architect`.
