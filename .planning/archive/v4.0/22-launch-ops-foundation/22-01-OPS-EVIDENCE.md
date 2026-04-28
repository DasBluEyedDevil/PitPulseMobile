# Phase 22-01: Launch Ops Evidence

- Railway project: `SoundCheck`
- Railway environment: `production`
- Railway service: `SoundCheck`
- Public domain: `soundcheck-app.up.railway.app`
- Execution date: 2026-03-12 (initial), 2026-03-13 (secret rotation + env update)
- Operator: Codex (initial), Claude + User (rotation session)

**No secret values recorded**

## OPS-01: Secret Rotation

OPS-01: complete

| Secret | Status | Rotated At | Rotated By | Rollback Note |
|--------|--------|------------|------------|---------------|
| DB password | rotated | 2026-03-13 | User (Railway dashboard) | Revert via Railway PostgreSQL credential reset if connectivity breaks |
| JWT_SECRET | rotated | 2026-03-13 | Claude (crypto.randomBytes 64) | Re-enter previous secret if forced to restore existing sessions |
| SETLISTFM_API_KEY | rotated | 2026-03-13 | User (provider regeneration + Railway set) | Re-enter previous key if event enrichment breaks |

Post-rotation verification:
- Health check: 200 with database connected (2026-03-13T00:05:32Z)
- Auth rejection: 401 on invalid login (confirmed)
- Feed auth guard: 401 without token (confirmed)

## OPS-02: Railway Environment Parity

OPS-02: partial (10/13 external provider vars configured 2026-04-19; 3 remain — 1 deferred, 2 pending accounts)

### Configured (22/25) *(updated 2026-04-19)*
- `NODE_ENV=production`
- `DATABASE_URL: configured` (Railway PostgreSQL auto-inject)
- `DB_SSL: configured` (false — Railway internal connection)
- `JWT_SECRET: configured` (rotated 2026-03-13)
- `SETLISTFM_API_KEY: configured` (rotated 2026-03-13)
- `CORS_ORIGIN: configured` (* — permissive, acceptable for mobile-only beta)
- `BASE_URL: configured` (https://soundcheck-app.up.railway.app — set 2026-03-13)
- `APP_STORE_URL: configured` (placeholder — set 2026-03-13)
- `PLAY_STORE_URL: configured` (placeholder — set 2026-03-13)
- `ENABLE_WEBSOCKET: configured` (true — set 2026-03-13)
- `MUSICBRAINZ_USER_AGENT: configured` (SoundCheck/1.0 — fixed from PitPulse, 2026-03-13)
- `NODE_TLS_REJECT_UNAUTHORIZED: configured` (1 — re-enabled TLS verification, 2026-03-13)

### Newly Configured 2026-04-19 (10 vars across 5 providers)
- `REDIS_URL: configured` — Railway Redis plugin wired (duplicate `Redis-aASe` service removed)
- `SENTRY_DSN: configured` — Sentry project `soundcheck-backend` in org `9th-level-software`, DSN set in Railway
- `CLOUDFLARE_ACCOUNT_ID: configured` — Cloudflare account wired
- `R2_ACCESS_KEY_ID: configured` — Account API token scoped to `soundcheck-photos`, Object R/W (verified via S3 HeadBucket)
- `R2_SECRET_ACCESS_KEY: configured` — same token
- `R2_BUCKET_NAME: configured` — `soundcheck-photos` (public dev URL enabled)
- `R2_PUBLIC_URL: configured` — `https://pub-d61ee7749e8e46caa821a459ed16f650.r2.dev`
- `REVENUECAT_WEBHOOK_AUTH: configured` — RevenueCat project `c3c9b756`, webhook Authorization shared secret
- `FIREBASE_SERVICE_ACCOUNT_JSON: configured` — Firebase project `soundcheck-prod-e973c`, adminsdk JSON single-lined (prod `/health` confirms `firebaseConfigured: true`)
- `TICKETMASTER_API_KEY: configured` — Discovery API consumer key (Soundcheck app, Web / Read-only / Public APIs). Verified 200 response, 234538 events accessible.

### Still Missing — require external provider accounts (3)
- `RESEND_API_KEY: deferred` — signup + `getsoundcheck.app` domain DNS verification postponed by user 2026-04-19
- `GOOGLE_CLIENT_ID: missing` — Google Cloud Console > Credentials > OAuth 2.0
- `APPLE_BUNDLE_ID: missing` — Apple Developer account not yet created

## OPS-03: Migration, Demo Seed, and Launch Verification

OPS-03: complete

- Migration 039: applied before this execution and reconfirmed in `pgmigrations`
- Demo seed: complete
- Base seed fallback: not required (`venues` and `bands` already populated in production)
- Health check: 200 with healthy database
- Auth behavior: verified (`POST /api/users/login` with invalid credentials returned 401)
- Feed auth guard: verified (`GET /api/feed` without auth returned 401 `Access token required`)
- Sentry verification: deferred with blocker (`SENTRY_DSN` missing and no admin JWT provided)

### OPS-03 Execution Notes

- Initial production `seed:demo` failure was a real repo bug in `backend/src/scripts/seed-demo.ts`: `checkins.location_verified` does not exist; fixed to `is_verified`.
- Manual Railway deployments had to target a clean repo-root snapshot because the service is configured with `rootDirectory=backend`.
- `backend/.railwayignore` was excluding `src`, which broke backend-root deploys until corrected.
- Production does not currently apply migrations on deploy via the observed service manifest, so corrective migrations were applied manually after each successful deploy with `npm run migrate:up`.

### Corrective Migrations Applied During OPS-03

- `040_add-missing-user-stat-columns`: restored `users.total_checkins`, `users.unique_bands`, and `users.unique_venues`
- `041_add-missing-band-and-venue-stat-columns`: restored `bands.total_checkins`, `bands.unique_fans`, `venues.total_checkins`, and `venues.unique_visitors`
- `042_add-earned-checkin-id-to-user-badges`: restored `user_badges.earned_checkin_id`

### Production Verification Snapshot

- Latest deployment after secret rotation: redeploy triggered 2026-03-13
- Previous successful deployment: `88dc4e44-1a9f-454c-8810-845f4ebe8c0c`
- Demo users present: `5`
- Demo check-ins present: `36`
- Demo badges present: `7`
- Demo follow relationships present in `user_followers`: `24`

## Blockers

- OPS-02 partial: 4 third-party integration variables still require external provider accounts (Resend, Google OAuth, Apple Developer, Ticketmaster)
- APP_STORE_URL and PLAY_STORE_URL are placeholders until apps are published
- APPLE_BUNDLE_ID deferred until Apple Developer account is created

## 2026-04-19 Session Notes

- Railway deploy unblocked: master `f3b7d67` → `d9c480f` (TS errors in upload.ts / CheckinCreatorService.ts resolved on branch, fast-forwarded master).
- Migration chain 043-061 applied to prod DB. Required:
  - Dedup 20 duplicate demo events + 36 orphan event_lineup + 10 orphan demo checkins before 047 unique index would build.
  - Idempotency patch on migration 048 (`fix(migration): make 048 rename idempotent against 041 corrective`, commit 60fbcd2) — 041 corrective had already added `total_checkins`, so 048 rename now handles all 4 column-state permutations.
- Stale `total_reviews` data discarded on venues/bands; `total_checkins` retained as authoritative (backfilled by 047 from `checkin_band_ratings`).
- Duplicate Redis service `Redis-aASe` removed (user); `Redis` wired to SoundCheck via `REDIS_URL` reference variable.
- Firebase mobile configs still point at `soundcheck-placeholder` — `mobile/android/app/google-services.json` and `mobile/ios/Runner/GoogleService-Info.plist` must be regenerated from new Firebase project `soundcheck-prod-e973c` before push notifications will reach devices (follow-up work, out of OPS-02 scope).
- Sentry smoke test deferred: requires admin JWT + `POST /api/debug/sentry-test`.
- RevenueCat webhook test-send deferred: RC dashboard > Webhooks > Send test event → expect 200.
