# Phase 28: v5.0 AUDIT -- Context

## Phase Goal
Produce `.planning/milestones/v5.0-AUDIT.md` enumerating concrete E2E gaps for all 10 v5.0 flows (B1-B5 Core Check-in, D1-D5 Social/Sharing). Every claim backed by file path + line or API endpoint. Findings seed Phases 29+.

## Requirements Covered
- `AUDIT-01`: `.planning/milestones/v5.0-AUDIT.md` exists and enumerates per-flow gaps for all 10 flows (B1-B5, D1-D5). Each gap entry: as-is state, missing behavior, affected files/endpoints, severity, proposed fix. Audit findings group into candidate Phase 29+ phases.

Concretizes 10 placeholder requirements (B1-B5, D1-D5) — actual concrete requirements written into `.planning/REQUIREMENTS.md` after audit completes (Plan 28-03).

## Scope -- 10 E2E Flows

### B. Core Check-in (Plan 28-01)
| ID | Flow | Success Criteria |
|----|------|------------------|
| B1 | Quick check-in <10s | App open -> GPS -> event match -> rating -> submit -> visible in feed |
| B2 | Photo upload E2E | Camera/gallery -> presigned URL -> R2 PUT -> display on check-in card |
| B3 | Multi-band event check-in | Per-set band ratings capture correctly |
| B4 | User-created event auto-merge | Manual event -> Ticketmaster fuzzy match -> merge within N hours |
| B5 | Location verify edge cases | No-GPS path, large venue radius, spoof detection, venue_type-aware radius |

### D. Social / Sharing (Plan 28-02)
| ID | Flow | Success Criteria |
|----|------|------------------|
| D1 | Check-in celebration share | Post-checkin celebration -> Instagram Stories / X / TikTok with app-store CTA |
| D2 | Badge unlock share | Badge detail -> shared card -> landing page |
| D3 | Wrapped annual recap share | Pro feature; story slides + branded recap cards |
| D4 | Shared link landing page | Non-user click -> web landing w/ App Store + Play Store deep links |
| D5 | Satori card rendering | Templates render with real user data, no overflow, WCAG-accessible |

## Existing Assets to Audit Against

### Backend
- `backend/src/services/CheckinCreatorService.ts` (~600 LOC facade)
- `backend/src/services/CheckinService.ts`
- `backend/src/services/EventService.ts` (Ticketmaster sync, fuzzy merge)
- `backend/src/services/LocationService.ts` (GPS verification, radius)
- `backend/src/services/ShareCardService.ts` + satori templates
  - `backend/src/templates/badge-card.ts`
  - `backend/src/templates/checkin-card.ts`
  - `backend/src/templates/wrapped-*.ts`
- `backend/src/templates/landing-page.html`
- `backend/src/services/UploadService.ts` (R2 presigned URLs)
- `backend/src/routes/uploadRoutes.ts`
- `backend/src/services/BadgeService.ts` (unlock triggers)
- `backend/src/services/WrappedService.ts`

### Mobile
- `mobile/lib/src/features/checkin/presentation/checkin_screen.dart`
- `mobile/lib/src/features/checkin/data/checkin_providers.dart` (NOTE: known stale `createCheckIn()` ref per PROJECT.md tech debt)
- `mobile/lib/src/features/checkin/presentation/celebration_screen.dart`
- `mobile/lib/src/features/badges/presentation/badge_detail_screen.dart`
- `mobile/lib/src/features/wrapped/presentation/wrapped_*_screen.dart`
- `mobile/lib/src/features/share/` (share card preview, social platform handlers)
- `mobile/lib/src/core/services/location_service.dart`

### Prior Audits (Format Reference)
- `.planning/milestones/v2.0-AUDIT.md` — coverage matrix + integration verification + gaps format
- `.planning/milestones/v3.0-AUDIT.md` — design audit format

## Known Tech Debt (Verify Impact)
Per PROJECT.md (2026-03-14 update):
- `checkin_providers.dart` + `checkin_screen.dart` reference removed `createCheckIn()` method — directly impacts B1
- CheckinService still ~600 LOC after legacy removal (facade pattern)
- No mobile screen for claimed owner stats or band profile edit (out-of-scope for v5.0)
- 3 OPS-02 provider vars open (Resend deferred, Google OAuth, Apple Developer) — Apple impacts iOS device testing for B-flow verification

## Plan Structure

### Wave 1 (parallel — read-only audits + write findings)
- **Plan 28-01**: Core Check-in E2E Audit (B1-B5). Agents: `QA Verification Specialist` (lead) + `Mobile App Builder`. Output: `28-01-FINDINGS.md`.
- **Plan 28-02**: Social/Sharing E2E Audit (D1-D5). Agents: `QA Verification Specialist` (lead) + `Senior Developer`. Output: `28-02-FINDINGS.md`.

### Wave 2 (depends on 28-01, 28-02)
- **Plan 28-03**: AUDIT Consolidation + Phase 29+ Breakdown. Agents: `Senior Project Manager` (lead) + `Reality Checker`. Output: `.planning/milestones/v5.0-AUDIT.md` + REQUIREMENTS.md / ROADMAP.md / STATE.md updates.

## Audit Methodology (Apply to Every Flow)

### 1. Trace E2E
App entry point -> mobile widget tree -> repository/provider -> HTTP call -> backend route -> controller -> service -> DB / external API -> response -> mobile render -> user-visible state.

### 2. Evidence Requirement (per gap classification)
Every claim must include `file:line` or `METHOD /path` reference. Additional evidence required by classification:

| Class | Required Evidence |
|-------|-------------------|
| **BROKEN** | file:line **+ reproduction** (curl output, log excerpt, test failure, or emulator screenshot). Inferred-broken without repro = downgrade to UNTESTED. |
| **MISSING** | file:line of nearest related code OR explicit "no matching code path found in `<dir>` (searched: `<grep pattern>`)". |
| **PARTIAL** | file:line of present side + explicit absence proof on missing side (grep miss). |
| **UNTESTED** | file:line of code + grep miss against `__tests__/` or `*.test.ts` / `*_test.dart`. |
| **DEGRADED** | file:line + concrete defect description (specific UX bug, perf number, a11y violation). |

### 3. Verification Mode
Tag each gap with verification mode:
- **STATIC-PASS**: code-read only (default; weakest evidence)
- **RUNTIME-VERIFIED**: backend endpoint hit with curl OR Android emulator exercised OR satori template rendered against fixture data
- **BLOCKED-OPS-02**: cannot verify due to missing provider (Apple Developer pending blocks iOS device, Resend DNS blocks email, Google OAuth blocks Google sign-in path)

Auditors SHOULD attempt RUNTIME-VERIFIED for: B5 spoof detection, B4 Ticketmaster fuzzy merge, D1 platform share dispatch, D5 satori rendering, D4 OG crawler / deep link resolution. Backend endpoints reachable via prod `https://soundcheck-app.up.railway.app` + curl.

### 4. Severity Rubric (concrete, not subjective)
- **HIGH**: happy-path crashes OR core success criterion documented in flow row of CONTEXT.md is unachievable in current code. Examples: B1 check-in cannot complete, D4 deep link returns 404.
- **MED**: happy-path works but degraded UX OR edge case crashes OR observable functional bug not blocking primary use. Examples: photo loads slowly, share card text overflows.
- **LOW**: polish, perf-not-on-critical-path, a11y-non-blocking, code hygiene. Examples: stale comment, missing loading skeleton, copy tweak.

### 5. Header Schema (machine-checkable)
- Per-flow gap section MUST be h3 (`### B1`, `### B2`, ... `### D5`).
- Plan 28-03 verifies via `grep -c '^### [BD][1-5]'` and fails loudly if all 10 sections not found.

### 6. Proposed Fix
1-2 sentence sketch + estimated LOC + affected files.

## Standing Assumptions (out-of-scope but documented)

These are not audited in Phase 28 and are not v5.0 gap candidates. They are pre-conditions or pre-existing surfaces:

| Assumption | Rationale | Last verified |
|------------|-----------|---------------|
| Auth (login, JWT issue, token refresh) works correctly | Audited in v2.0 BETA-08, v1.1 Phase 9. Auth is prerequisite to every B/D flow. | v2.0-AUDIT.md |
| Onboarding gate (genre picker, has_seen_onboarding redirect) works | v2.0 BETA-10 verified router redirect | v2.0-AUDIT.md |
| Block / report enforcement on feeds/queries works | v1.1 Phase 9.1 + 11.1 closed | v1.1 archive |
| Premium entitlement source-of-truth = `users.is_premium` written by RevenueCat webhook | v1.1 Phase 12 implementation. **D3 audit MUST cross-verify but not re-audit.** | v1.1 archive |

If audit discovers any of these assumptions is wrong, flag as **PRECONDITION-VIOLATION** with HIGH severity — do not silently absorb into a flow gap.

## Cross-Cutting Surfaces (audit once, not per-flow)

The following touch multiple flows. Plan 28-03 dedupes; Plans 28-01/02 should call out shared usage but not re-audit:

| Surface | Flows | Owner Plan |
|---------|-------|------------|
| `CheckinCreatorService` | B1, B2, B3 | 28-01 (audit once) |
| `LocationService` | B1, B5 | 28-01 (audit once) |
| `EventService` (Ticketmaster sync) | B1, B4 | 28-01 (audit once) |
| `UploadService` (R2 presigned URLs) | B2 | 28-01 |
| `ShareCardService` + satori templates | D1, D2, D3, D5 | 28-02 (audit once) |
| `BadgeService` (unlock trigger -> share) | D2 | 28-02 |
| `WrappedService` + Pro entitlement check | D3 | 28-02 |
| Landing page / share routes | D1, D2, D3, D4 | 28-02 |

## Out of Scope for Phase 28
- Writing the fixes (Phases 29+ do that).
- Running E2E on real iOS device (BLOCKED-OPS-02).
- B2B venue tools, web presence, collaborative filtering, horizontal scaling (all Future).
- Auditing flows outside B/D set (follow/unfollow, RSVP, search, push notifications, FOMO feed, password reset deep link, etc.) — **SCOPE NOTE**: per user direction (exploration-v5.0 §Decision A, 2026-04-19), v5.0 milestone is scoped to "check-in + sharing surfaces" only, NOT "every Validated feature E2E". Milestone language in ROADMAP.md should be read as such. Other-domain audits would be separate milestone (v5.1+).
