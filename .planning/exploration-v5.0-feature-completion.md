# Exploration: v5.0 — Feature Completion & E2E Polish

**Mode**: crystallize
**Date**: 2026-04-19
**Status**: Crystallized → Proceed to planning

## Raw Concept

> "Full e2e functionality/feature enablement and overall polish"

## Crystallized Summary

**v5.0 — Feature Completion & E2E Polish.** Audit and close all gaps in the core check-in flow and social sharing pipeline, following the v1.1 gap-closure pattern (audit → identify → close). Every feature in the PROJECT.md Validated list must work end-to-end on a real device from app open → backend → database → external integration → UI render. Goal: no partial features, no "backend exists, mobile broken" gaps, no shipped-but-untested flows.

Scope: **10 E2E flows across 2 domains** plus audit-driven ancillary gap closure.

## Scope — 10 E2E Flows

### B. Core Check-in (5 flows)
| ID | Flow | Success Criteria |
|----|------|------------------|
| B1 | Quick check-in <10s | App open → GPS → event match → rating → submit → visible in feed |
| B2 | Photo upload E2E | Camera/gallery → presigned URL → PUT to R2 → display on check-in card |
| B3 | Multi-band event check-in | Per-set band ratings capture correctly on multi-band lineups |
| B4 | User-created event check-in | Manual event creation auto-merges with Ticketmaster match within N hours |
| B5 | Location verify edge cases | No-GPS path, large venue radius, spoof detection, venue_type-aware radius |

### D. Social / Sharing (5 flows)
| ID | Flow | Success Criteria |
|----|------|------------------|
| D1 | Check-in celebration share | Post-checkin celebration → Instagram Stories / X / TikTok card, with app-store CTA |
| D2 | Badge unlock share | Badge detail → shared card → landing page |
| D3 | Wrapped annual recap share | Pro feature; story slides + branded recap cards to social |
| D4 | Shared link landing page | Non-user click → web landing w/ correct App Store + Play Store deep links |
| D5 | Share card rendering | Satori templates (badge-card.ts, checkin-card.ts, wrapped-*.ts) render with real user data, no overflow, WCAG-accessible |

## Execution Model

- **Pattern**: v1.1 gap-closure (Phase 9.1, 10.1, 10.2, 11.1, 11.2)
- **Kick-off**: AUDIT phase (similar to v2.0-AUDIT, v3.0-AUDIT) enumerating actual gaps per flow
- **Then**: numbered phases closing gaps found, one-to-few plans per phase
- **Estimated scope**: 6-8 phases, ~25-30 plans (v1.1 had 30 plans, comparable)

## Knowns

- **Scope bounds**: check-in E2E + social sharing E2E. Everything else is out-of-scope for v5.0 (B2B, web presence, collaborative filtering, horizontal scaling — all Future list).
- **Infrastructure ready for E2E**: R2 bucket + token live, Firebase wired both sides, Sentry DSN set, Ticketmaster API key verified, RevenueCat webhook auth set, Redis connected.
- **Mobile Firebase real**: project `soundcheck-prod-e973c`, apps registered (iOS `1:843136025510:ios:2b1e3e37c22b410ca74567`, Android `1:843136025510:android:7ee8b1c4f09d78a3a74567`), real `google-services.json` + `GoogleService-Info.plist` locally.
- **Prod deploy green**: master `dfab264`, `/health` 200, DB + Redis + Firebase + WebSocket all up.
- **Migrations applied**: 061 is current DB state, zero pending.
- **Satori share pipeline exists**: `ShareCardService`, templates (badge/checkin/wrapped), `landing-page.html`.
- **Prior art**: v1.1 5 gap-closure phases shipped successfully under this exact pattern.

## Unknowns → Resolution Path

| Unknown | Resolve via |
|---------|-------------|
| Exact gap inventory per flow | Phase 28 AUDIT — read code, exercise flows, produce v5.0-AUDIT.md |
| Device testing access (iOS real device) | Depends on Apple Developer enrollment (pending, Out-of-scope OPS-02) — Android physical device + iOS Simulator can cover ~90% |
| Priority vs remaining OPS-02 providers | v5.0 work can proceed in parallel with OPS-02 cleanup — not mutually blocking |
| Share card landing domain | Currently `soundcheck-app.up.railway.app`; may want `getsoundcheck.app` (user's registered domain) before v5.0 ships |
| TestFlight/Play Console internal track setup | Out-of-scope for v5.0 scope but implied blocker for "real device E2E" verification |

## Out of Scope (v5.0)

- Collaborative filtering (Future)
- WebSocket horizontal scaling (Future)
- Public API with OAuth2 (Future)
- B2B venue owner dashboard (Future — user revisited as "⚠️ Revisit" in PROJECT.md decisions)
- Web presence / marketing site (Future — user revisited as "⚠️ Revisit")
- Apple Developer enrollment + App Store submission (separate track, not v5.0)
- Resend DNS setup (deferred by user 2026-04-19)
- Google OAuth configuration (still pending provider setup)

## Dependencies

- **Hard**: none — can start immediately against current master.
- **Soft**: Apple Developer enrollment unblocks iOS device testing for B-flow verification.
- **Parallel-safe**: remaining OPS-02 provider setup runs alongside without conflict.

## Recommended Next Action

Run `/legion:plan` to scope Phase 28 (AUDIT). Phase 28 produces `.planning/milestones/v5.0-AUDIT.md` enumerating concrete gaps per flow, which then seed Phases 29+.

Alternative: run `/legion:milestone` first to formally open v5.0 before planning Phase 28.

## Decision

**A — Proceed to planning** (selected 2026-04-19)

---

*Crystallized 2026-04-19 via /legion:explore crystallize mode — 4 exchanges, scope locked at all 10 E2E flows per user direction.*
