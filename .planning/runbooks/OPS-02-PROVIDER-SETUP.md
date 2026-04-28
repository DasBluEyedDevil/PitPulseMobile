# OPS-02 — External Provider Account Setup Runbook

> Unblocks Phase 22 (v4.0 Launch Ops Foundation). Completes the 13 missing env vars documented in `.planning/archive/v4.0/22-launch-ops-foundation/22-01-OPS-EVIDENCE.md`.

**Owner**: requires human operator — account creation needs billing info, email verification, 2FA, and ToS acceptance.
**Target**: all 13 provider env vars set in Railway `SoundCheck` / `production` environment.
**Prereq**: Railway CLI logged in (`railway login`) and linked (`railway link`) to SoundCheck project/production.

---

## Tier Summary

| Tier | Providers | Why |
|------|-----------|-----|
| A (Launch-blocking) | Redis, Firebase, Cloudflare R2, Sentry, Ticketmaster | App degrades badly or fails core features without these |
| B (Feature-gating) | RevenueCat, Resend, Google OAuth | Required for Pro, password reset, Google Sign-In |
| C (Store-gated) | Apple Bundle ID, APP_STORE_URL, PLAY_STORE_URL | Placeholders OK until apps published |

Suggested order: A → B → C. Finish Tier A in one sitting; takes ~60-90 min if accounts don't already exist.

---

## Master Checklist

Tick each on completion:

- [ ] REDIS_URL — Railway Redis plugin
- [ ] FIREBASE_SERVICE_ACCOUNT_JSON — Firebase Console
- [ ] CLOUDFLARE_ACCOUNT_ID — Cloudflare
- [ ] R2_ACCESS_KEY_ID — Cloudflare R2
- [ ] R2_SECRET_ACCESS_KEY — Cloudflare R2
- [ ] R2_BUCKET_NAME — Cloudflare R2 (bucket `soundcheck-photos`)
- [ ] R2_PUBLIC_URL — Cloudflare R2 public dev URL
- [ ] SENTRY_DSN — sentry.io
- [ ] TICKETMASTER_API_KEY — developer.ticketmaster.com
- [ ] REVENUECAT_WEBHOOK_AUTH — RevenueCat
- [ ] RESEND_API_KEY — resend.com
- [ ] GOOGLE_CLIENT_ID — Google Cloud Console
- [ ] APPLE_BUNDLE_ID — Apple Developer (defer until account created)

---

## Tier A: Launch-Blocking

### A1. Redis (Railway plugin) — `REDIS_URL`

**Why**: distributed rate limiting, BullMQ jobs, WebSocket pub/sub. App degrades without it.

Steps:
1. Railway Dashboard → SoundCheck project → **+ New** → **Database** → **Add Redis**
2. Railway auto-injects `REDIS_URL` into all services in the environment. No manual variable needed.
3. Verify:
   ```
   railway variables | grep REDIS_URL
   ```
4. Trigger redeploy if service does not auto-restart.

Validation: `/health` still returns 200; Railway logs show `Redis connected` on startup (search winston logs).

---

### A2. Firebase Cloud Messaging — `FIREBASE_SERVICE_ACCOUNT_JSON`

**Why**: push notifications (check-in toasts, badges, RSVP friend-going).

Steps:
1. https://console.firebase.google.com → **Add project** → name `SoundCheck` (use existing if Android/iOS FCM already configured via `docs/FIREBASE_SETUP.md`).
2. Project Settings (gear icon) → **Service accounts** tab → **Generate new private key** → downloads `*.json`.
3. Convert JSON to single-line string (Windows PowerShell):
   ```
   (Get-Content .\soundcheck-firebase-adminsdk.json -Raw) | ConvertFrom-Json | ConvertTo-Json -Compress
   ```
4. Set in Railway:
   ```
   railway variables --set "FIREBASE_SERVICE_ACCOUNT_JSON=<paste single-line JSON>"
   ```
   Quote-heavy — prefer Railway dashboard → Variables → **Raw Editor** if CLI escaping breaks.
5. Verify no quoting damage:
   ```
   railway run node -e "console.log(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON).project_id)"
   ```

Validation: logs show `Firebase Admin initialized` on startup; push notifications send on test check-in.

---

### A3. Cloudflare R2 — 5 vars

**Why**: check-in photo uploads (presigned URL flow). Blocks any photo feature.

Prereq: Cloudflare account with R2 enabled (free tier: 10 GB storage, 10M reads/mo).

Steps:
1. https://dash.cloudflare.com → Sign up / log in → **R2** in sidebar → **Enable R2** (requires billing card even on free tier).
2. **Create bucket**:
   - Name: `soundcheck-photos`
   - Location: Automatic
3. Bucket → **Settings** → **Public access** → **Allow access via r2.dev** → copy URL (e.g. `https://pub-abc123.r2.dev`) → this is `R2_PUBLIC_URL`.
4. Top-right **account ID** (sidebar → R2 overview page, bottom) → this is `CLOUDFLARE_ACCOUNT_ID`.
5. R2 → **Manage R2 API Tokens** → **Create API token**:
   - Permissions: **Object Read & Write**
   - Specify bucket: `soundcheck-photos`
   - TTL: no expiry (or rotate per policy)
6. Copy **Access Key ID** → `R2_ACCESS_KEY_ID`.
7. Copy **Secret Access Key** (shown once) → `R2_SECRET_ACCESS_KEY`.
8. Set in Railway:
   ```
   railway variables --set "CLOUDFLARE_ACCOUNT_ID=<id>" --set "R2_ACCESS_KEY_ID=<key>" --set "R2_SECRET_ACCESS_KEY=<secret>" --set "R2_BUCKET_NAME=soundcheck-photos" --set "R2_PUBLIC_URL=<r2.dev URL>"
   ```

Validation: request presigned upload via authenticated API; PUT a test image; confirm object appears in bucket and public URL resolves.

---

### A4. Sentry — `SENTRY_DSN`

**Why**: error tracking. Already documented in `backend/DEPLOYMENT.md#sentry-setup`.

Steps:
1. https://sentry.io → Sign up (free tier: 5k errors/mo).
2. **Create project** → **Node.js** platform → name `soundcheck-backend`.
3. Copy DSN from project Settings → Client Keys (DSN). Shape: `https://xxx@o123.ingest.sentry.io/456`.
4. Set:
   ```
   railway variables --set "SENTRY_DSN=<dsn>"
   ```

Validation: after redeploy, hit `GET /api/debug/sentry-test` with admin JWT → error appears in Sentry within ~30s. Confirm PII scrubbing — no `authorization`, `cookie`, `x-api-key` headers in event payload.

---

### A5. Ticketmaster — `TICKETMASTER_API_KEY`

**Why**: primary event sync pipeline (Phase 2 v1.0). Blocks new event ingestion.

Steps:
1. https://developer.ticketmaster.com → Sign up.
2. **My Apps** → **Add New App** → name `SoundCheck`.
3. Copy **Consumer Key** → this is `TICKETMASTER_API_KEY`. (Consumer Secret not needed — Discovery API uses key only.)
4. Default rate limit: 5 req/s, 5000/day. Request quota increase if launch traffic demands more.
5. Set:
   ```
   railway variables --set "TICKETMASTER_API_KEY=<key>"
   ```

Validation: trigger event sync job (BullMQ) → new events appear in `events` table. Check Railway logs for `Ticketmaster API 200`.

---

## Tier B: Feature-Gating

### B1. RevenueCat — `REVENUECAT_WEBHOOK_AUTH`

**Why**: subscription webhook validates SoundCheck Pro entitlements server-side.

Steps:
1. https://app.revenuecat.com → Sign up → **Create project** → `SoundCheck`.
2. **Apps** → add iOS + Android app (use Apple Bundle ID + Android package name).
3. **Products** → create `soundcheck_pro_monthly` ($4.99/mo) matching App Store Connect / Play Console product IDs.
4. **Integrations** → **Webhooks** → set URL: `https://soundcheck-app.up.railway.app/api/webhooks/revenuecat`.
5. Copy **Authorization header** value (shared secret) → this is `REVENUECAT_WEBHOOK_AUTH`.
6. Set:
   ```
   railway variables --set "REVENUECAT_WEBHOOK_AUTH=<secret>"
   ```

Validation: RevenueCat → Webhooks → **Send test event** → backend returns 200; `processed_webhook_events` row inserted.

---

### B2. Resend — `RESEND_API_KEY`

**Why**: password reset emails, notification emails.

Steps:
1. https://resend.com → Sign up (free tier: 3000 emails/mo, 100/day).
2. **Domains** → **Add Domain** → enter your domain (e.g. `soundcheck.app`) → add DNS records (SPF, DKIM) at registrar → wait for verification (~5-30 min).
3. **API Keys** → **Create API Key** → name `railway-production` → permission **Sending access** → copy key (starts `re_`).
4. Decide `RESEND_FROM_ADDRESS` (default `SoundCheck <noreply@yourdomain.com>`).
5. Set:
   ```
   railway variables --set "RESEND_API_KEY=<re_key>" --set "RESEND_FROM_ADDRESS=SoundCheck <noreply@yourdomain.com>"
   ```

Validation: trigger `POST /api/auth/forgot-password` on a real account → email received within 30s. Check Resend dashboard → **Logs** for delivery.

If no custom domain available yet: Resend provides `onboarding@resend.dev` sender (testing only, no production use).

---

### B3. Google OAuth — `GOOGLE_CLIENT_ID`

**Why**: Google Sign-In on mobile.

Steps:
1. https://console.cloud.google.com → **Create project** `SoundCheck`.
2. **APIs & Services** → **OAuth consent screen** → **External** → fill app info (name, support email, logo, privacy policy URL, terms URL).
3. **Credentials** → **Create Credentials** → **OAuth client ID**:
   - For backend verification use **Web application** client (used for ID token audience validation).
   - Create additional iOS and Android clients for mobile SDK integration (match bundle IDs).
4. Copy Web client **Client ID** → this is `GOOGLE_CLIENT_ID` used by backend to verify tokens.
5. Add production domain to **Authorized JavaScript origins** (if backend validates via Web SDK flow).
6. Set:
   ```
   railway variables --set "GOOGLE_CLIENT_ID=<client-id>.apps.googleusercontent.com"
   ```

Validation: mobile Google Sign-In returns ID token → backend `/api/auth/google` verifies audience matches → user session issued.

---

## Tier C: Store-Gated

### C1. Apple Developer — `APPLE_BUNDLE_ID`

**Why**: Apple Sign-In + App Store submission. Deferred until Apple Developer account ($99/yr) created.

Steps (after account ready):
1. https://developer.apple.com → enroll → pay annual fee → wait for approval (up to 48h, sometimes instant).
2. **Certificates, Identifiers & Profiles** → **Identifiers** → register new App ID:
   - Description: `SoundCheck`
   - Bundle ID: `com.yourcompany.soundcheck` (match what's in `mobile/ios/Runner.xcodeproj`)
3. Enable **Sign In with Apple** capability on the identifier.
4. Set:
   ```
   railway variables --set "APPLE_BUNDLE_ID=com.yourcompany.soundcheck"
   ```

### C2 / C3. Store URLs — `APP_STORE_URL` / `PLAY_STORE_URL`

Placeholders already set (2026-03-13). Replace with real listing URLs once apps are published:
```
railway variables --set "APP_STORE_URL=https://apps.apple.com/app/soundcheck/id<REAL_ID>" --set "PLAY_STORE_URL=https://play.google.com/store/apps/details?id=com.yourcompany.soundcheck"
```

---

## Post-Setup Verification

Run after all Tier A+B variables set:

```bash
# Railway redeploy if needed
railway redeploy

# 1. Full env parity check — should list all 25 expected vars
railway variables | grep -E "^(NODE_ENV|DATABASE_URL|JWT_SECRET|REDIS_URL|FIREBASE_SERVICE_ACCOUNT_JSON|CLOUDFLARE_ACCOUNT_ID|R2_ACCESS_KEY_ID|R2_SECRET_ACCESS_KEY|R2_BUCKET_NAME|R2_PUBLIC_URL|REVENUECAT_WEBHOOK_AUTH|RESEND_API_KEY|GOOGLE_CLIENT_ID|APPLE_BUNDLE_ID|TICKETMASTER_API_KEY|SETLISTFM_API_KEY|SENTRY_DSN|CORS_ORIGIN|BASE_URL|APP_STORE_URL|PLAY_STORE_URL|ENABLE_WEBSOCKET|MUSICBRAINZ_USER_AGENT|NODE_TLS_REJECT_UNAUTHORIZED|DB_SSL)="

# 2. Health check (DB + startup)
curl -s https://soundcheck-app.up.railway.app/health | jq .

# 3. Sentry smoke test (admin JWT required)
curl -s https://soundcheck-app.up.railway.app/api/debug/sentry-test \
  -H "Authorization: Bearer <ADMIN_JWT>"
```

After verification passes:

1. Update `.planning/archive/v4.0/22-launch-ops-foundation/22-01-OPS-EVIDENCE.md`:
   - Move each provider from `Missing` to `Configured` with a date stamp (no secret values).
2. Update `.planning/REQUIREMENTS.md`:
   - Check `[x] **OPS-02**: NODE_ENV=production set, all third-party env vars configured in Railway`.
3. Update `.planning/STATE.md`:
   - Change Phase 22 status to **Complete**.
   - Note: "v4.0 fully closed — OPS-02 unblocked {date}".
4. Update PROJECT.md tech debt: remove `13 production env vars missing (OPS-02...)` line.
5. Close GitHub issue #14.

---

## Rotation & Security Notes

- Never commit any of these values. `backend/.env.example` contains placeholders only.
- Rotate on any suspected leak:
  - Firebase: Service Accounts → **Revoke** old key → generate new.
  - R2: Manage R2 API Tokens → **Roll** token.
  - Sentry: Client Keys → regenerate DSN.
  - Resend: API Keys → **Delete** + create new.
  - Ticketmaster: My Apps → regenerate consumer key.
  - RevenueCat: Webhooks → generate new shared secret (update in both places atomically).
- `gitleaks` pre-commit hook already blocks accidental commits of most secret patterns.

---

## Time Estimate

| Tier | Est. Time (assuming no existing accounts) |
|------|--------------------------------------------|
| A (Redis, Firebase, R2, Sentry, Ticketmaster) | 60-90 min |
| B (RevenueCat, Resend, Google OAuth) | 60-90 min (plus DNS propagation wait for Resend) |
| C (Apple) | 5 min active + 0-48h Apple enrollment wait |

**Total sittings**: 2 sessions of ~90 min each. Apple runs in parallel.
