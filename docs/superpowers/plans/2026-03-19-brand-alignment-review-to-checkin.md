# Brand Alignment: Review → Check-In Language Cleanup

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate all legacy "review" language from SoundCheck, replacing with "check-in" terminology to align with the app's core identity as a social concert check-in platform (the "Untappd of live music").

**Architecture:** Phased rename across 6 layers: user-facing UI strings → mobile data models → backend types/services → database columns → dead code cleanup → documentation/legal. Each phase is independently deployable, testable, and produces a clean commit.

**Tech Stack:** Flutter/Dart (Freezed code-gen models), Node.js/Express/TypeScript, PostgreSQL

---

## Important: What NOT to Change

"Review" has two distinct meanings in this codebase. Only rename the **product review** meaning, NOT the **admin moderation review** meaning:

| Keep As-Is (Admin Review) | Why |
|---------------------------|-----|
| `claim_submission_screen.dart` — "We'll review your claim" | Admin reviewing a claim request |
| `my_claims_screen.dart` — `reviewNotes` field | Admin notes on a claim decision |
| `report_bottom_sheet.dart` — "Our team will review it" | Moderation team reviewing a report |
| `claimRoutes.ts` — `/api/admin/claims/:id/review` | Admin claim review endpoint |
| `moderationRoutes.ts` — moderation review endpoints | Admin moderation operations |
| `claim_repository.dart` — `reviewNotes` field | Admin claim data model |

Also preserve: "rating" is fine everywhere. Untappd has ratings too. The problem is "review" (a standalone content type) not "rating" (an enrichment of a check-in).

---

## Pre-Existing Bug Found During Audit

The "Most Reviewed" sort option is **silently broken** on both bands and venues. Mobile sends `-reviewCount`, backend converts via `camelToSnakeCase()` to `review_count`, but the allowed sort columns list contains `total_reviews` — so it falls back to alphabetical. This plan fixes the bug as part of the rename (Task 5 + Task 10).

---

## File Map

### Phase 1: User-Facing UI Text (Tasks 1–5)
| File | Lines | Change |
|------|-------|--------|
| `mobile/lib/src/features/auth/presentation/login_screen.dart` | 256 | Tagline text |
| `mobile/lib/src/features/auth/presentation/register_screen.dart` | 214 | Subtitle text |
| `mobile/lib/src/features/profile/presentation/settings_screen.dart` | 68, 143 | Notification + about text |
| `mobile/lib/src/features/checkins/presentation/checkin_detail_screen.dart` | 704–756 | Section header + widget class rename |
| `mobile/lib/src/features/bands/presentation/band_detail_screen.dart` | 387 | Stat label |
| `mobile/lib/src/features/discover/presentation/discover_screen.dart` | 786, 2089 | Card count labels |
| `mobile/lib/src/shared/widgets/venue_card.dart` | 141 | Count label |
| `mobile/lib/src/shared/widgets/band_card.dart` | 147 | Count label |
| `mobile/lib/src/features/bands/presentation/band_filters_state.dart` | 11, 27–28, 46–47 | Sort enum + label + API param |
| `mobile/lib/src/features/venues/presentation/venue_filters_state.dart` | 12, 27–28, 44–45 | Sort enum + label + API param |

### Phase 2: Mobile Data Models (Tasks 6–7)
| File | Lines | Change |
|------|-------|--------|
| `mobile/lib/src/features/checkins/domain/checkin.dart` | 24–25 | `reviewText` → `noteText` |
| `mobile/lib/src/features/venues/domain/venue.dart` | 52 | `totalReviews` → `totalCheckins` |
| `mobile/lib/src/features/bands/domain/band.dart` | 28 | `totalReviews` → `totalCheckins` |
| All files referencing `.reviewText` | various | Update property access |
| All files referencing `.totalReviews` | various | Update property access |

### Phase 3: Backend Types & Services (Tasks 8–10)
| File | Lines | Change |
|------|-------|--------|
| `backend/src/types/index.ts` | 65, 105 | Interface field rename |
| `backend/src/services/checkin/types.ts` | 81, 173 | Field + mapper rename |
| `backend/src/services/BandService.ts` | 119, 310, 427 | Comment, allowed sorts, mapper |
| `backend/src/services/VenueService.ts` | 138, 445 | Allowed sorts, mapper |
| `backend/src/services/SearchService.ts` | 239, 269 | Mapper output |
| `backend/src/services/UserService.ts` | 308, 319, 332, 344 | Type, SQL alias, mapper |
| `backend/src/services/SetlistFmService.ts` | 379 | Mapper output |
| `backend/src/services/FoursquareService.ts` | 309 | Mapper output |
| `backend/src/services/MusicBrainzService.ts` | 250 | Mapper output |
| `backend/src/services/WishlistService.ts` | 251 | Mapper output + remove comment |
| `backend/src/services/NotificationService.ts` | 26, 387 | Type field rename |
| `backend/src/services/checkin/CheckinCreatorService.ts` | 113 | Column name in INSERT |
| Backend test files | various | Update assertions |

### Phase 4: Database Migration (Task 11)
| File | Action |
|------|--------|
| `backend/migrations/048_rename_review_to_checkin.ts` | Create: rename columns |
| `backend/database-schema.sql` | Update: column names + comments |

### Phase 5: Cleanup (Task 12)
| File | Lines | Change |
|------|-------|--------|
| `mobile/lib/src/core/services/analytics_service.dart` | 209–214 | Remove dead review events |
| `mobile/lib/src/shared/utils/image_compression.dart` | 64–65 | Rename method |
| `mobile/lib/src/features/venues/domain/venue.dart` | 57 | Update comment |
| `mobile/lib/src/features/bands/domain/band.dart` | 33 | Update comment |

### Phase 6: Documentation & Legal (Tasks 13–14)
| File | Action |
|------|--------|
| `README.md` | Rewrite feature description |
| `backend/README.md` | Rewrite: remove dead reviews API docs |
| `TERMS_OF_SERVICE.md` | Replace "reviews" with "check-ins" |
| `PRIVACY_POLICY.md` | Replace "reviews" with "check-ins" |

---

## Task 1: Auth Screen Text

**Files:**
- Modify: `mobile/lib/src/features/auth/presentation/login_screen.dart:256`
- Modify: `mobile/lib/src/features/auth/presentation/register_screen.dart:214`

- [ ] **Step 1: Update login tagline**

In `login_screen.dart`, find line 256 and change:
```dart
'Discover, Review, Connect'
```
to:
```dart
'Check In, Share, Connect'
```

- [ ] **Step 2: Update register subtitle**

In `register_screen.dart`, find line 214 and change:
```dart
'Start discovering and reviewing venues'
```
to:
```dart
'Start checking in to live shows'
```

- [ ] **Step 3: Run analyzer**

Run: `cd mobile && flutter analyze lib/src/features/auth/presentation/login_screen.dart lib/src/features/auth/presentation/register_screen.dart`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add mobile/lib/src/features/auth/presentation/login_screen.dart mobile/lib/src/features/auth/presentation/register_screen.dart
git commit -m "fix(brand): replace 'review' language in auth screens with check-in terminology"
```

---

## Task 2: Settings Screen Text

**Files:**
- Modify: `mobile/lib/src/features/profile/presentation/settings_screen.dart:68,143`

- [ ] **Step 1: Update notification subtitle**

In `settings_screen.dart`, find line 68 and change:
```dart
'New reviews, badges, and followers'
```
to:
```dart
'New check-ins, badges, and followers'
```

- [ ] **Step 2: Update about dialog description**

Find line 143 and change:
```dart
'Discover and review concert venues and bands. Share your experiences with the music community.'
```
to:
```dart
'Check in at live shows. Track your concert history. Share the moment with friends.'
```

- [ ] **Step 3: Run analyzer**

Run: `cd mobile && flutter analyze lib/src/features/profile/presentation/settings_screen.dart`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add mobile/lib/src/features/profile/presentation/settings_screen.dart
git commit -m "fix(brand): replace 'review' language in settings screen"
```

---

## Task 3: Check-In Detail Screen — "Review" Section → "Notes"

**Files:**
- Modify: `mobile/lib/src/features/checkins/presentation/checkin_detail_screen.dart:704-756`

- [ ] **Step 1: Rename section header**

Find line 733 and change the section header:
```dart
'Review'
```
to:
```dart
'Notes'
```

- [ ] **Step 2: Rename widget class and property**

Find the `_ReviewSection` class (lines 704–756). Rename:
- Class: `_ReviewSection` → `_NotesSection`
- Property: `final String reviewText;` → `final String noteText;` (but keep the constructor parameter name matching the data model field for now — this will be updated in Task 6 when the model changes)
- Update the reference where this widget is instantiated (search for `_ReviewSection(` in the same file)

**Note:** Only rename the class and the section header label. The `reviewText` property reference to `checkin.reviewText` stays until Task 6 renames the model field.

- [ ] **Step 3: Run analyzer**

Run: `cd mobile && flutter analyze lib/src/features/checkins/presentation/checkin_detail_screen.dart`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add mobile/lib/src/features/checkins/presentation/checkin_detail_screen.dart
git commit -m "fix(brand): rename Review section to Notes in check-in detail"
```

---

## Task 4: Band/Venue Count Labels — "reviews" → "check-ins"

**Files:**
- Modify: `mobile/lib/src/features/bands/presentation/band_detail_screen.dart:387`
- Modify: `mobile/lib/src/features/discover/presentation/discover_screen.dart:786,2089`
- Modify: `mobile/lib/src/shared/widgets/venue_card.dart:141`
- Modify: `mobile/lib/src/shared/widgets/band_card.dart:147`

- [ ] **Step 1: Update band detail stat label**

In `band_detail_screen.dart`, find line 387 and change:
```dart
label: 'Reviews'
```
to:
```dart
label: 'Check-ins'
```

- [ ] **Step 2: Update discover screen venue count**

In `discover_screen.dart`, find line 786 and change:
```dart
'${venue.totalReviews} reviews'
```
to:
```dart
'${venue.totalReviews} check-ins'
```

- [ ] **Step 3: Update discover screen band count**

Find line 2089 and change:
```dart
'${band.totalReviews} reviews  ${band.genre ?? "Various"}'
```
to:
```dart
'${band.totalReviews} check-ins  ${band.genre ?? "Various"}'
```

- [ ] **Step 4: Update venue card count**

In `venue_card.dart`, find line 141 and change:
```dart
'(${venue.totalReviews})'
```
to:
```dart
'(${venue.totalReviews} check-ins)'
```

- [ ] **Step 5: Update band card count**

In `band_card.dart`, find line 147 and change:
```dart
'(${band.totalReviews})'
```
to:
```dart
'(${band.totalReviews} check-ins)'
```

- [ ] **Step 6: Run analyzer on all changed files**

Run: `cd mobile && flutter analyze lib/src/features/bands/presentation/band_detail_screen.dart lib/src/features/discover/presentation/discover_screen.dart lib/src/shared/widgets/venue_card.dart lib/src/shared/widgets/band_card.dart`
Expected: No errors

- [ ] **Step 7: Commit**

```bash
git add mobile/lib/src/features/bands/presentation/band_detail_screen.dart mobile/lib/src/features/discover/presentation/discover_screen.dart mobile/lib/src/shared/widgets/venue_card.dart mobile/lib/src/shared/widgets/band_card.dart
git commit -m "fix(brand): replace 'reviews' count labels with 'check-ins' on cards and discover"
```

---

## Task 5: Sort Filter Labels — "Most Reviewed" → "Most Popular"

**Files:**
- Modify: `mobile/lib/src/features/bands/presentation/band_filters_state.dart:11,27-28,46-47`
- Modify: `mobile/lib/src/features/venues/presentation/venue_filters_state.dart:12,27-28,44-45`

- [ ] **Step 1: Update band sort enum**

In `band_filters_state.dart`:
1. Line 11: rename enum value `reviewCountDesc` → `checkinCountDesc`
2. Line 27–28: change display label `'Most Reviewed'` → `'Most Popular'`
3. Line 46–47: change API parameter from `'-reviewCount'` → `'-total_checkins'`

```dart
// Before
enum BandSortBy { ... reviewCountDesc ... }
// ...
case BandSortBy.reviewCountDesc: return 'Most Reviewed';
// ...
case BandSortBy.reviewCountDesc: return '-reviewCount';

// After
enum BandSortBy { ... checkinCountDesc ... }
// ...
case BandSortBy.checkinCountDesc: return 'Most Popular';
// ...
case BandSortBy.checkinCountDesc: return '-total_checkins';
```

- [ ] **Step 2: Update all references to `BandSortBy.reviewCountDesc`**

Search the codebase for `BandSortBy.reviewCountDesc` and update to `BandSortBy.checkinCountDesc`. Check:
- `mobile/lib/src/features/bands/presentation/bands_screen.dart`
- Any other files referencing this enum value

- [ ] **Step 3: Update venue sort enum (same pattern)**

In `venue_filters_state.dart`:
1. Line 12: rename enum value `reviewCountDesc` → `checkinCountDesc`
2. Line 27–28: change display label `'Most Reviewed'` → `'Most Popular'`
3. Line 44–45: change API parameter from `'-reviewCount'` → `'-total_checkins'`

- [ ] **Step 4: Update all references to `VenueSortBy.reviewCountDesc`**

Search and update in:
- `mobile/lib/src/features/venues/presentation/venues_screen.dart`
- Any other files referencing this enum value

- [ ] **Step 5: Run analyzer**

Run: `cd mobile && flutter analyze lib/src/features/bands/presentation/ lib/src/features/venues/presentation/`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add mobile/lib/src/features/bands/presentation/ mobile/lib/src/features/venues/presentation/
git commit -m "fix(brand): rename 'Most Reviewed' sort to 'Most Popular', fix sort parameter mapping"
```

**Note:** The API parameter is changing from `-reviewCount` to `-total_checkins`. The backend sort mapping must also be updated (Task 10) to accept `total_checkins` in its allowed sort columns. Until Task 10 is complete, this sort option will fall back to default. (It was already broken — see pre-existing bug note above.)

---

## Task 6: Mobile Domain Models — Field Renames

**Files:**
- Modify: `mobile/lib/src/features/checkins/domain/checkin.dart:24-25`
- Modify: `mobile/lib/src/features/venues/domain/venue.dart:52`
- Modify: `mobile/lib/src/features/bands/domain/band.dart:28`

**Important:** These are Freezed models. After renaming fields, you MUST run `build_runner` to regenerate `.freezed.dart` and `.g.dart` files. The generated JSON key will match the new field name (camelCase), so the backend API response must also be updated (Task 8) for these to deserialize correctly.

**Strategy:** Add `@JsonKey(name: 'totalReviews')` temporarily so the app works with the current backend API while we update both sides. Remove the annotation after Task 8 updates the backend.

- [ ] **Step 1: Rename `reviewText` in checkin model**

In `checkin.dart`, find lines 24–25 and change:
```dart
// Review text (was 'comment')
String? reviewText,
```
to:
```dart
// Check-in note text
@JsonKey(name: 'reviewText') String? noteText,
```

- [ ] **Step 2: Rename `totalReviews` in venue model**

In `venue.dart`, find line 52 and change:
```dart
@Default(0) int totalReviews,
```
to:
```dart
@JsonKey(name: 'totalReviews') @Default(0) int totalCheckins,
```

- [ ] **Step 3: Rename `totalReviews` in band model**

In `band.dart`, find line 28 and change:
```dart
@Default(0) int totalReviews,
```
to:
```dart
@JsonKey(name: 'totalReviews') @Default(0) int totalCheckins,
```

- [ ] **Step 4: Run Freezed code generation**

Run: `cd mobile && dart run build_runner build --delete-conflicting-outputs`
Expected: Successful code generation with no errors

- [ ] **Step 5: Fix all compilation errors from the rename**

Search for all references to the old field names and update them:

```bash
# In the mobile directory, search for old field references:
grep -rn "\.reviewText" lib/
grep -rn "\.totalReviews" lib/
grep -rn "reviewText:" lib/  # named constructor parameters
grep -rn "totalReviews:" lib/  # named constructor parameters
```

Update every reference:
- `.reviewText` → `.noteText`
- `.totalReviews` → `.totalCheckins`
- `reviewText:` → `noteText:` (in constructor calls / copyWith)
- `totalReviews:` → `totalCheckins:` (in constructor calls / copyWith)

Key files to check (not exhaustive — follow compiler errors):
- `checkin_detail_screen.dart` — the `_NotesSection` (renamed in Task 3)
- `band_detail_screen.dart` — `_CheckInPreviewCard` uses `checkin.reviewText`
- `discover_screen.dart` — references `venue.totalReviews` and `band.totalReviews`
- `venue_card.dart`, `band_card.dart` — card display
- `feed_card.dart` — feed display
- Any checkin provider/repository files

- [ ] **Step 6: Run analyzer**

Run: `cd mobile && flutter analyze`
Expected: No errors (full project analysis to catch all reference updates)

- [ ] **Step 7: Run existing tests**

Run: `cd mobile && flutter test`
Expected: All tests pass

- [ ] **Step 8: Commit**

```bash
git add mobile/lib/
git commit -m "refactor(brand): rename reviewText→noteText, totalReviews→totalCheckins in mobile models

Temporary @JsonKey annotations preserve backward compat with current backend API.
Annotations will be removed after backend rename in next task."
```

---

## Task 7: Remove Temporary @JsonKey Annotations

**Depends on:** Task 8 (backend rename) must be completed first.

**Files:**
- Modify: `mobile/lib/src/features/checkins/domain/checkin.dart`
- Modify: `mobile/lib/src/features/venues/domain/venue.dart`
- Modify: `mobile/lib/src/features/bands/domain/band.dart`

- [ ] **Step 1: Remove @JsonKey annotations**

Remove the temporary `@JsonKey(name: 'reviewText')` and `@JsonKey(name: 'totalReviews')` annotations added in Task 6, since the backend now sends the new field names.

In `checkin.dart`:
```dart
// Before
@JsonKey(name: 'reviewText') String? noteText,
// After
String? noteText,
```

In `venue.dart`:
```dart
// Before
@JsonKey(name: 'totalReviews') @Default(0) int totalCheckins,
// After
@Default(0) int totalCheckins,
```

In `band.dart`:
```dart
// Before
@JsonKey(name: 'totalReviews') @Default(0) int totalCheckins,
// After
@Default(0) int totalCheckins,
```

- [ ] **Step 2: Rebuild Freezed models**

Run: `cd mobile && dart run build_runner build --delete-conflicting-outputs`
Expected: Successful generation

- [ ] **Step 3: Run tests**

Run: `cd mobile && flutter test`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add mobile/lib/
git commit -m "refactor(brand): remove temporary @JsonKey compat annotations after backend rename"
```

---

## Task 8: Backend Types and Primary Service Mappers

**Files:**
- Modify: `backend/src/types/index.ts:65,105`
- Modify: `backend/src/services/checkin/types.ts:81,173`
- Modify: `backend/src/services/BandService.ts:310,427`
- Modify: `backend/src/services/VenueService.ts:445`
- Modify: `backend/src/services/NotificationService.ts:26,387`
- Modify: `backend/src/services/checkin/CheckinCreatorService.ts:113`

- [ ] **Step 1: Update Venue type interface**

In `types/index.ts`, find line 65 and change:
```typescript
totalReviews: number;
```
to:
```typescript
totalCheckins: number;
```

- [ ] **Step 2: Update Band type interface**

In `types/index.ts`, find line 105 and change:
```typescript
totalReviews: number;
```
to:
```typescript
totalCheckins: number;
```

- [ ] **Step 3: Update checkin types**

In `services/checkin/types.ts`:

Line 81 — change field name:
```typescript
// Before
reviewText?: string;
// After
noteText?: string;
```

Line 173 — change mapper output:
```typescript
// Before
reviewText: row.review_text || undefined,
// After
noteText: row.review_text || undefined,
```

- [ ] **Step 4: Update BandService mapper and comment**

In `BandService.ts`:

Line 310 — fix comment:
```typescript
// Before
* Update band rating after review
// After
* Update band rating after check-in
```

Line 427 — change mapper output:
```typescript
// Before
totalReviews: parseInt(row.total_reviews || 0),
// After
totalCheckins: parseInt(row.total_reviews || 0),
```

- [ ] **Step 5: Update VenueService mapper**

In `VenueService.ts`, find line 445 and change:
```typescript
// Before
totalReviews: parseInt(row.total_reviews || 0),
// After
totalCheckins: parseInt(row.total_reviews || 0),
```

- [ ] **Step 6: Update NotificationService**

In `NotificationService.ts`:

Line 26 — change type field:
```typescript
// Before
reviewText?: string;
// After
noteText?: string;
```

Line 387 — change mapper:
```typescript
// Before
reviewText: row.checkin_comment,
// After
noteText: row.checkin_comment,
```

- [ ] **Step 7: Fix all TypeScript compilation errors**

Run: `cd backend && npx tsc --noEmit`

Fix every file that references the old field names (`totalReviews`, `reviewText`). Key files to check:
- Any route handler accessing `checkin.reviewText`
- Any service constructing Band or Venue objects with `totalReviews`

- [ ] **Step 8: Commit**

```bash
git add backend/src/types/ backend/src/services/
git commit -m "refactor(brand): rename totalReviews→totalCheckins, reviewText→noteText in backend types and primary services"
```

---

## Task 9: Backend Secondary Service Mappers

**Files:**
- Modify: `backend/src/services/SearchService.ts:239,269`
- Modify: `backend/src/services/UserService.ts:308,319,332,344`
- Modify: `backend/src/services/SetlistFmService.ts:379`
- Modify: `backend/src/services/FoursquareService.ts:309`
- Modify: `backend/src/services/MusicBrainzService.ts:250`
- Modify: `backend/src/services/WishlistService.ts:251`

- [ ] **Step 1: Update SearchService mappers**

In `SearchService.ts`:

Line 239 — venue mapper:
```typescript
// Before
totalReviews: parseInt(row.total_reviews || 0),
// After
totalCheckins: parseInt(row.total_reviews || 0),
```

Line 269 — band mapper:
```typescript
// Before
totalReviews: parseInt(row.total_reviews || 0),
// After
totalCheckins: parseInt(row.total_reviews || 0),
```

- [ ] **Step 2: Update UserService**

In `UserService.ts`:

Line 308 — type definition:
```typescript
// Before
totalReviews: number;
// After
totalCheckins: number;
```

Line 319 — SQL alias comment:
```sql
-- Before
0 as review_count, -- reviews table dropped in migration 043
-- After
0 as checkin_review_count, -- reviews table dropped in migration 043; legacy stat
```

Line 332 — default value:
```typescript
// Before
totalReviews: 0,
// After
totalCheckins: 0,
```

Line 344 — mapper:
```typescript
// Before
totalReviews: parseInt(stats.review_count, 10) || 0,
// After
totalCheckins: parseInt(stats.review_count, 10) || 0,
```

- [ ] **Step 3: Update integration service mappers**

In `SetlistFmService.ts` line 379:
```typescript
// Before
totalReviews: parseInt(row.total_reviews || 0),
// After
totalCheckins: parseInt(row.total_reviews || 0),
```

In `FoursquareService.ts` line 309:
```typescript
// Before (note: uses totalRatings, not totalReviews — verify before changing)
totalRatings: parseInt(row.total_reviews || 0),
```
**Check:** This file maps `total_reviews` to `totalRatings` (not `totalReviews`). If `totalRatings` is a valid field on the return type, leave it as-is. Only change if it maps to `totalReviews`.

In `MusicBrainzService.ts` line 250:
```typescript
// Same check as FoursquareService — verify the field name before changing
totalRatings: parseInt(row.total_reviews || 0),
```

In `WishlistService.ts` line 251:
```typescript
// Before
totalReviews: parseInt(row.b_total_checkins) || 0, // Maps total_checkins column; field name kept for Band type compat
// After
totalCheckins: parseInt(row.b_total_checkins) || 0,
```

- [ ] **Step 4: Run TypeScript compilation check**

Run: `cd backend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/
git commit -m "refactor(brand): rename totalReviews→totalCheckins in secondary service mappers"
```

---

## Task 10: Backend Sort Column Mapping + Tests

**Files:**
- Modify: `backend/src/services/BandService.ts:119`
- Modify: `backend/src/services/VenueService.ts:138`
- Modify: `backend/src/__tests__/routes/userStats.test.ts`
- Modify: `backend/src/__tests__/services/UserService.stats.test.ts`
- Modify: `backend/src/__tests__/services/DataExportService.test.ts:248,268`

- [ ] **Step 1: Fix band sort column mapping**

In `BandService.ts`, find line 119 and update:
```typescript
// Before
const allowedSortColumns = ['name', 'genre', 'formed_year', 'hometown', 'average_rating', 'total_reviews', 'created_at'];
// After
const allowedSortColumns = ['name', 'genre', 'formed_year', 'hometown', 'average_rating', 'total_checkins', 'created_at'];
```

**Note:** After the DB migration (Task 11), the column will be `total_checkins`. The mobile now sends `-total_checkins` (from Task 5). The backend receives it, strips the `-`, and checks against the allowed list. This makes the sort actually work (it was broken before — see pre-existing bug note).

- [ ] **Step 2: Fix venue sort column mapping**

In `VenueService.ts`, find line 138 and update:
```typescript
// Before
const allowedSortColumns = ['name', 'city', 'average_rating', 'total_reviews', 'capacity', 'created_at'];
// After
const allowedSortColumns = ['name', 'city', 'average_rating', 'total_checkins', 'capacity', 'created_at'];
```

- [ ] **Step 3: Update backend tests — UserService stats**

In `UserService.stats.test.ts`, update all test assertions:
- Change `totalReviews` → `totalCheckins` in expected objects
- Change `review_count` → `checkin_review_count` in mock DB rows (if updated in Task 9)
- Update SQL assertion checks

In `userStats.test.ts` (route tests):
- Change `totalReviews` → `totalCheckins` in expected response bodies
- Change `review_count` in mock data

- [ ] **Step 4: Update DataExportService test**

In `DataExportService.test.ts`:
Line 248 — check if `badge_type: 'review_count'` is a database value or a test fixture:
- If it's a real badge type stored in the DB: leave it (badge types are separate from display language)
- If it's a test-only value: update to `'checkin_count'`

Line 268 — update the corresponding assertion if badge type changed

- [ ] **Step 5: Run all backend tests**

Run: `cd backend && npm test`
Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add backend/src/ backend/src/__tests__/
git commit -m "fix(brand): update sort column mappings and test assertions for review→checkin rename"
```

---

## Task 11: Database Migration — Rename Columns

**Files:**
- Create: `backend/migrations/048_rename_review_to_checkin.ts`
- Modify: `backend/database-schema.sql`

**Important:** This migration renames DB columns. All backend SQL queries that reference `total_reviews` must be updated FIRST (Tasks 8–10), OR this migration must use expand-contract pattern. Since this is a monorepo deployed atomically, we rename columns and update queries in the same deploy.

- [ ] **Step 1: Update all SQL queries referencing `total_reviews`**

Before writing the migration, search for ALL SQL queries in the backend that reference `total_reviews`:
```bash
grep -rn "total_reviews" backend/src/services/
```

Update every SQL query to use `total_checkins` instead. Key files:
- `BandService.ts` — SELECT lists (lines 30, 57, 134, 193, 233, 257, 275), UPDATE (line 321)
- `VenueService.ts` — SELECT lists (lines 36, 69, 153, 214, 258, 261, 262, 294), UPDATE (line 337)
- `SearchService.ts` — SELECT lists (lines 57, 68, 95, 106)

- [ ] **Step 2: Write the migration**

Create `backend/migrations/048_rename_review_to_checkin.ts`:
```typescript
import { Pool } from 'pg';

export async function up(pool: Pool): Promise<void> {
  await pool.query(`
    ALTER TABLE venues RENAME COLUMN total_reviews TO total_checkins;
    ALTER TABLE bands RENAME COLUMN total_reviews TO total_checkins;
  `);
}

export async function down(pool: Pool): Promise<void> {
  await pool.query(`
    ALTER TABLE venues RENAME COLUMN total_checkins TO total_reviews;
    ALTER TABLE bands RENAME COLUMN total_checkins TO total_reviews;
  `);
}
```

- [ ] **Step 3: Update database-schema.sql**

In `database-schema.sql`:

Line 66 (venues table):
```sql
-- Before
total_reviews INTEGER NOT NULL DEFAULT 0,
-- After
total_checkins INTEGER NOT NULL DEFAULT 0,
```

Line 93 (bands table):
```sql
-- Before
total_reviews INTEGER NOT NULL DEFAULT 0,
-- After
total_checkins INTEGER NOT NULL DEFAULT 0,
```

Line 128 (checkins table comment):
```sql
-- Before
comment TEXT, -- "What's the vibe?" - optional review text
-- After
comment TEXT, -- "What's the vibe?" - optional check-in note
```

- [ ] **Step 4: Run TypeScript compilation**

Run: `cd backend && npx tsc --noEmit`
Expected: No errors (all SQL string references updated)

- [ ] **Step 5: Run tests**

Run: `cd backend && npm test`
Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add backend/migrations/048_rename_review_to_checkin.ts backend/database-schema.sql backend/src/services/
git commit -m "refactor(brand): rename total_reviews→total_checkins DB columns with migration 048"
```

---

## Task 12: Cleanup — Dead Analytics Events and Utility Renames

**Files:**
- Modify: `mobile/lib/src/core/services/analytics_service.dart:209-214`
- Modify: `mobile/lib/src/shared/utils/image_compression.dart:64-65`
- Modify: `mobile/lib/src/features/venues/domain/venue.dart:57` (comment)
- Modify: `mobile/lib/src/features/bands/domain/band.dart:33` (comment)

- [ ] **Step 1: Remove dead review analytics events**

In `analytics_service.dart`, find lines 209–214 and delete the entire block:
```dart
// Reviews
static const String reviewCreated = 'review_created';
static const String reviewUpdated = 'review_updated';
static const String reviewDeleted = 'review_deleted';
static const String reviewLiked = 'review_liked';
static const String reviewUnliked = 'review_unliked';
```

Also search for any references to these constants elsewhere in the codebase. If referenced, remove the call sites too (they're tracking events for a feature that no longer exists).

Also find and remove any `reviewId` property reference (around line 255).

- [ ] **Step 2: Rename image compression utility**

In `image_compression.dart`, find line 64–65 and rename:
```dart
// Before
/// Compress image for review/post (medium size)
static Future<File?> compressReviewImage(File file) async {
// After
/// Compress image for check-in photo (medium size)
static Future<File?> compressCheckinImage(File file) async {
```

Search for all references to `compressReviewImage` and update to `compressCheckinImage`.

- [ ] **Step 3: Update domain model comments**

In `venue.dart`, find line 57 (comment) and update:
```dart
// Before
// from check-in venue_rating, not old reviews
// After
// from check-in venue_rating
```

In `band.dart`, find line 33 (comment) and update:
```dart
// Before
// from check-in ratings, not old reviews
// After
// from check-in ratings
```

- [ ] **Step 4: Run analyzer and tests**

Run: `cd mobile && flutter analyze && flutter test`
Expected: No errors, all tests pass

- [ ] **Step 5: Commit**

```bash
git add mobile/lib/
git commit -m "refactor(brand): remove dead review analytics events, rename compressReviewImage"
```

---

## Task 13: README Documentation Updates

**Files:**
- Modify: `README.md`
- Modify: `backend/README.md`

- [ ] **Step 1: Rewrite root README feature description**

In `README.md`:

Line 2 — change:
```markdown
A full-stack mobile application for discovering and reviewing concert venues and bands
```
to:
```markdown
A social concert check-in app — the Untappd of live music. Check in at shows, rate bands and venues, earn badges, and see what your friends are attending.
```

Line 9 — change:
```markdown
- Write and read reviews with ratings
```
to:
```markdown
- Check in at live shows with ratings and notes
```

- [ ] **Step 2: Rewrite backend README**

In `backend/README.md`:

Line 3 — change the description to match check-in identity.

Lines 10, 70, 74, 116–125, 163, 202–207 — remove ALL references to:
- "Reviews & Ratings" feature description
- `reviews` table (dropped in migration 043)
- `review_helpfulness` table (dropped)
- The entire Reviews API endpoint documentation (lines 116–125) — these routes don't exist
- "Create Review" example (line 163)
- Review-based badges: "First Review," "Review Master," "Review Legend," "Helpful Reviewer"

Replace with accurate check-in-based descriptions:
- "Check-ins & Ratings" feature
- Current badge names (from the badges table)
- Current API endpoints

- [ ] **Step 3: Commit**

```bash
git add README.md backend/README.md
git commit -m "docs(brand): rewrite READMEs to reflect check-in identity, remove dead reviews API docs"
```

---

## Task 14: Legal Document Updates

**Files:**
- Modify: `TERMS_OF_SERVICE.md`
- Modify: `PRIVACY_POLICY.md`

**Important:** These are legal documents. Replacements should be careful and contextual, not blind find-and-replace. Some uses of "review" (meaning "read/examine") are legitimate English and should stay.

- [ ] **Step 1: Update Terms of Service**

In `TERMS_OF_SERVICE.md`, make these targeted changes:

| Line | Before | After |
|------|--------|-------|
| 25 | "Read and write reviews for venues and bands" | "Check in at shows and rate venues and bands" |
| 69 | "Post false, misleading, or fraudulent reviews" | "Post false, misleading, or fraudulent check-ins" |
| 78 | "Manipulate ratings or reviews" | "Manipulate ratings or check-ins" |
| 85 | "reviews, comments, photos" | "check-ins, comments, photos" |
| 108–116 | Section 4.3 "Reviews and Ratings" with 6 sub-bullets about review policies | Rewrite as "Check-ins and Ratings" with check-in-appropriate policies |
| 113 | "accept compensation for positive reviews" | "accept compensation for positive check-ins or ratings" |
| 114 | "post fake or misleading reviews" | "post fake or misleading check-ins" |
| 115 | "review your own business" | "check in to your own business fraudulently" |
| 215–217 | "user reviews" disclaimers | "user check-ins and ratings" disclaimers |
| 235 | "Reliance on reviews or ratings" | "Reliance on check-ins or ratings" |

**Keep unchanged:** Line 176 "We will review reports within 48 hours" (admin review meaning) and line 183 "Please review our Privacy Policy" (standard English meaning).

- [ ] **Step 2: Update Privacy Policy**

In `PRIVACY_POLICY.md`, make these targeted changes:

| Line | Before | After |
|------|--------|-------|
| 51 | "Display your reviews and ratings" | "Display your check-ins and ratings" |
| 79 | "Your username, profile picture, and reviews are publicly visible" | "Your username, profile picture, and check-ins are publicly visible" |
| 125 | "Delete individual reviews or comments" | "Delete individual check-ins or comments" |

**Keep unchanged:** Line 207 "We encourage you to review them" (standard English) and line 226 "You can review the current policy" (standard English).

- [ ] **Step 3: Commit**

```bash
git add TERMS_OF_SERVICE.md PRIVACY_POLICY.md
git commit -m "docs(brand): update legal documents to use check-in terminology instead of reviews"
```

---

## Execution Order and Dependencies

```
Task 1  ─┐
Task 2  ─┤
Task 3  ─┤── Phase 1: UI Text (independent, parallel-safe)
Task 4  ─┤
Task 5  ─┘
           ↓
Task 6  ──── Phase 2a: Mobile model renames (depends on Phase 1 for clean compile)
           ↓
Task 8  ─┐
Task 9  ─┤── Phase 3: Backend renames (independent of Task 6, but do after for clean flow)
Task 10 ─┘
           ↓
Task 7  ──── Phase 2b: Remove @JsonKey compat (depends on Tasks 8-9)
           ↓
Task 11 ──── Phase 4: DB migration (depends on Tasks 8-10 for SQL query updates)
           ↓
Task 12 ──── Phase 5: Cleanup (independent, but cleaner after model renames)
Task 13 ─┐
Task 14 ─┘── Phase 6: Docs/Legal (fully independent, parallel-safe)
```

**Parallel execution opportunities:**
- Tasks 1–5 can all run in parallel
- Tasks 8–10 can all run in parallel
- Tasks 13–14 can run in parallel with anything
- Task 12 can run in parallel with Tasks 13–14
