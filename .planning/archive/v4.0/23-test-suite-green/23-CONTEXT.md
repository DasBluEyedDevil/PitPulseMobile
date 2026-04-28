# Phase 23: Test Suite Green -- Context

## Phase Goal

CI passes with zero test failures, gating all subsequent refactoring.

## Requirements Covered

- `TEST-01`: All pre-existing test failures fixed -- full test suite passes with zero failures.

## What Already Exists

- `backend/src/__tests__/services/UserService.test.ts` — 2 failures caused by missing `isAdmin`/`isPremium` fields in test mock data. The `mapDbUserToUser()` function in `backend/src/utils/dbMappers.ts` (lines 23-24) now defaults `is_admin ?? false` and `is_premium ?? false`, but test expectations don't include these fields.
- `backend/src/__tests__/services/CheckinService.test.ts` — 8 failures caused by `mockUserId = 'user-123'` failing `BlockService.validateUUID()` which enforces UUID v4 format (`/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`). All 8 are in `getActivityFeed` describe block.
- `backend/src/services/BlockService.ts` (lines 131-152) — `validateUUID()` and `getBlockFilterSQL()` where the UUID check occurs.
- `backend/src/services/checkin/CheckinQueryService.ts` (line 160) — calls `this.blockService.getBlockFilterSQL(userId, 'c.user_id')` which triggers UUID validation.
- Full test suite: 405 tests total, 358 passing, 10 failing, 37 skipped.

## Key Design Decisions

- Fix test expectations/mocks only — do NOT modify production source code. The source code is correct; the tests are stale.
- Replace `'user-123'` with a deterministic UUID v4 constant (e.g., `'550e8400-e29b-41d4-a716-446655440000'`) rather than randomizing — keeps tests reproducible.
- Run `npm test` as the gate — all 405 tests must pass (10 previously failing + 358 already passing + 37 skipped is acceptable).
- Architecture proposals: skipped — trivial test fixes with no design decisions.
- Spec pipeline: skipped — scope is fully defined by the 10 known failures.

## Plan Structure

- **Plan 23-01 (Wave 1)**: Fix UserService expectations, fix CheckinService UUIDs, verify full suite passes. Agent: `engineering-senior-developer`.
