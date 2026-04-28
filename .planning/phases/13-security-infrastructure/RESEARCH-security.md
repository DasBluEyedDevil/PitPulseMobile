# Phase 13: Security Infrastructure - Research

**Researched:** 2026-03-01
**Domain:** Secret management, production hardening, Express trust proxy, Railway deployment
**Confidence:** HIGH

## Summary

This research covers four security/infrastructure requirements (BETA-01 through BETA-04) for hardening the SoundCheck backend before beta launch. The investigation found real production secrets sitting in `backend/.env` on disk (DB password, JWT secret, SetlistFM API key), NODE_ENV not being set to `production` in Railway (causing dotenv to load, debug logging, stack trace leakage, and relaxed CORS), numerous env vars referenced in code but likely not configured in Railway, and zero `trust proxy` configuration despite the app running behind Railway's reverse proxy (breaking rate limiting by IP).

All findings are based on direct source code inspection with HIGH confidence. No external library research was needed -- these are configuration and deployment concerns.

**Primary recommendation:** Address these four items as a pre-launch security gate. The secret rotation (BETA-01) is the highest priority since credentials are exposed in a local .env file. Trust proxy (BETA-04) is the most impactful because rate limiting is currently broken in production.

---

## BETA-01: Rotate All Exposed Secrets

### Current State

**backend/.env on disk** contains real production credentials:

| Secret | Value in .env | File:Line | Severity |
|--------|---------------|-----------|----------|
| `DATABASE_URL` | `[REDACTED]` | `backend/.env:3` | CRITICAL |
| `DB_PASSWORD` | `[REDACTED]` | `backend/.env:8` | CRITICAL |
| `JWT_SECRET` | `[REDACTED]` (128-char hex) | `backend/.env:12` | CRITICAL |
| `SETLISTFM_API_KEY` | `[REDACTED]` | `backend/.env:27` | HIGH |
| `CORS_ORIGIN` | `*` (wildcard) | `backend/.env:21` | MEDIUM |

### Git History Analysis

- **Commit `ae2a5f1`** (2025-07-31): `.env` was first committed with *placeholder* values (`password`, `your-super-secret-jwt-key-change-this-in-production`). NOT the real production secrets.
- **Commit `9d2b1a1`** (2025-10-21): `.env` was removed from git tracking and added to `.gitignore`.
- **Current `.gitignore`** correctly blocks `.env`, `backend/.env`, `.env.local`, `.env.*.local`.
- **The real production secrets currently in `backend/.env` were NEVER committed to git** -- they were added after the file was untracked.

### What Needs to Change

1. **Rotate DB password** -- In Railway PostgreSQL dashboard, change the password. Update `DATABASE_URL` in Railway env vars.
2. **Rotate JWT_SECRET** -- Generate a new secret (`node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`). Update in Railway. **WARNING: This will invalidate all existing user sessions/tokens.** Users must re-login.
3. **Rotate SetlistFM API key** -- Regenerate at setlist.fm account settings. Update in Railway env vars.
4. **Delete `backend/.env`** from the local filesystem entirely (or replace with placeholder values like `.env.example`). Development should use a separate `.env.local` or equivalent.
5. **Verify `.gitignore`** covers all variants -- currently covers `.env`, `backend/.env`, `.env.local`, `.env.*.local`. This is adequate.

### Dependencies and Risks

- **JWT rotation breaks all active sessions.** Plan for a mobile app update or communicate to beta users they need to re-login. Consider implementing a grace period or dual-secret validation.
- **DB password rotation** must be done atomically -- Railway should provide the new `DATABASE_URL` automatically if you rotate through their PostgreSQL plugin UI.
- **SetlistFM key rotation** -- This is a free non-commercial API key. Sign up at setlist.fm to get a new one.

---

## BETA-02: Set NODE_ENV=production in Railway

### Current State

`NODE_ENV` is NOT set to `production` in Railway based on the `.env` file having `NODE_ENV=development`. This means in production the app loads dotenv (harmless if no `.env` file exists on Railway), but more critically affects multiple behavior switches.

### Where NODE_ENV Is Checked

| File | Line | Condition | Behavior When NOT production |
|------|------|-----------|------------------------------|
| `backend/src/index.ts` | 6 | `!== 'production'` | Loads `dotenv.config()` -- reads `.env` file |
| `backend/src/index.ts` | 113 | `=== 'development'` | CORS allows all origins |
| `backend/src/index.ts` | 124 | `=== 'production'` | Wildcard CORS rejection NOT enforced |
| `backend/src/index.ts` | 280 | `=== 'development'` | Raw error messages exposed to client |
| `backend/src/index.ts` | 288 | `=== 'development'` | Stack traces included in error responses |
| `backend/src/index.ts` | 308, 334 | Logging | Environment label shows "development" |
| `backend/src/index.ts` | 324 | `=== 'production'` | CORS_ORIGIN warning NOT triggered |
| `backend/src/index.ts` | 336 | `=== 'development'` | API documentation URL logged |
| `backend/src/utils/logger.ts` | 46 | `!== 'production'` | Console transport added (colorized) |
| `backend/src/utils/logger.ts` | 60 | `=== 'production'` | File rotation transport NOT added |
| `backend/src/utils/logger.ts` | 89 | `=== 'production'` | Log level set to `debug` instead of `info` |
| `backend/src/utils/sentry.ts` | 26 | env label | Sentry reports `development` environment |
| `backend/src/utils/sentry.ts` | 28 | `=== 'production'` | Traces sample rate 1.0 (100%) instead of 0.1 (10%) |
| `backend/src/config/database.ts` | 113 | `=== 'development'` | Query logging to console (text, duration, rows) |
| `backend/src/scripts/retentionJob.ts` | 6 | `!== 'production'` | Loads dotenv |
| `backend/src/scripts/migrate.ts` | 7, 22 | `!== 'production'` / `=== 'production'` | Dotenv loading, SSL config |
| `backend/migrate.js` | 14 | `=== 'production'` | SSL config for legacy migration script |

### Impact of NOT Setting NODE_ENV=production

| Impact | Severity | Description |
|--------|----------|-------------|
| Stack trace leakage | HIGH | Error responses include `error.stack` to clients |
| Raw error messages | HIGH | Internal error messages shown instead of generic "Internal server error" |
| CORS wide open | HIGH | Development mode allows all origins regardless of CORS_ORIGIN |
| Query logging | MEDIUM | Every SQL query logged to console (performance + potential data leak) |
| Sentry over-sampling | MEDIUM | 100% trace sampling instead of 10% (cost/performance) |
| No log rotation | LOW | No file-based log rotation, only console |
| Debug-level logging | LOW | All debug messages emitted (noisy, potential info leak) |

### What Needs to Change

1. **Set `NODE_ENV=production`** in Railway environment variables dashboard.
2. **Set `CORS_ORIGIN`** in Railway -- when NODE_ENV=production, the code requires `CORS_ORIGIN` to be set and rejects wildcard `*`. For a mobile-only API, set to a specific domain or handle the no-origin case (mobile apps send no `Origin` header, which the code already allows at line 110).
3. No code changes needed -- all conditional logic is already in place.

### Risks

- **CORS for mobile**: The current code at line 110 (`if (!origin) return callback(null, true)`) allows requests with no `Origin` header (mobile apps, Postman). This is correct behavior. However, if `CORS_ORIGIN` is not set AND `NODE_ENV=production`, the CORS middleware will reject web browser requests (line 120-122). Since this is a mobile API, this is likely fine but should be verified.

---

## BETA-03: Configure All Missing Env Vars in Railway

### Complete Environment Variable Inventory

Below is every `process.env.*` reference in the source (excluding test files), where it's loaded, what happens when missing, and whether it's required for production.

#### Required for App Startup

| Env Var | File:Line | Required? | Behavior When Missing |
|---------|-----------|-----------|----------------------|
| `JWT_SECRET` | `src/index.ts:64-69` | **REQUIRED** | App exits with FATAL error |
| `DATABASE_URL` or `DB_PASSWORD` | `src/index.ts:73-76` | **REQUIRED (one of)** | App exits with FATAL error |
| `NODE_ENV` | `src/index.ts:6` | Recommended | Defaults to `development` behavior |
| `PORT` | `src/index.ts:79` | Optional | Defaults to `3000` |

#### Database Configuration (one set required)

| Env Var | File:Line | Default |
|---------|-----------|---------|
| `DATABASE_URL` | `src/config/database.ts:38-44` | none (used if present) |
| `DB_HOST` | `src/config/database.ts:73` | `localhost` |
| `DB_PORT` | `src/config/database.ts:74` | `5432` |
| `DB_NAME` | `src/config/database.ts:75` | `soundcheck` |
| `DB_USER` | `src/config/database.ts:76` | `postgres` |
| `DB_PASSWORD` | `src/config/database.ts:77` | none (required if no DATABASE_URL) |
| `DB_SSL` | `src/config/database.ts:11,35` | `verify` (rejectUnauthorized: true) |

#### Feature-Specific Env Vars (Requested for BETA-03)

| Env Var | File:Line | Effect When Missing | Priority |
|---------|-----------|---------------------|----------|
| `REDIS_URL` | `src/utils/redisRateLimiter.ts:22-27` and `src/config/redis.ts:16-24` | Falls back to in-memory rate limiting; BullMQ workers (event sync, badges, notifications, moderation) will NOT start | HIGH -- needed for distributed rate limiting and background jobs |
| `TICKETMASTER_API_KEY` | `src/services/EventSyncService.ts:61` and `src/services/TicketmasterAdapter.ts:53` and `src/controllers/EventController.ts:296` | Event sync disabled, manual sync returns error | MEDIUM |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | `src/services/PushNotificationService.ts:20-22` | Push notifications completely disabled | HIGH -- core feature |
| `CLOUDFLARE_ACCOUNT_ID` | `src/services/R2Service.ts:41` | Photo uploads disabled | HIGH -- core feature |
| `R2_ACCESS_KEY_ID` | `src/services/R2Service.ts:42` | Photo uploads disabled (needs all 3 R2 vars) | HIGH |
| `R2_SECRET_ACCESS_KEY` | `src/services/R2Service.ts:43` | Photo uploads disabled (needs all 3 R2 vars) | HIGH |
| `R2_BUCKET_NAME` | `src/services/R2Service.ts:37` | Defaults to `soundcheck-photos` | LOW -- has good default |
| `REVENUECAT_WEBHOOK_AUTH` | `src/controllers/SubscriptionController.ts:14-19` | Webhook returns "not configured" with 200 OK (silent failure) | HIGH -- monetization |
| `SENTRY_DSN` | `src/utils/sentry.ts:17-22` | Error tracking completely disabled | MEDIUM |
| `ENABLE_WEBSOCKET` | `src/utils/websocket.ts:53` | WebSocket server not started | LOW -- optional feature |

#### Additional Env Vars Found in Code (Not in BETA-03 list but may need configuration)

| Env Var | File:Line | Effect When Missing |
|---------|-----------|---------------------|
| `CORS_ORIGIN` | `src/index.ts:118-122` | In production mode, CORS rejects browser requests (mobile OK) |
| `RESEND_API_KEY` | `src/services/EmailService.ts:16-18` | Password reset emails not sent |
| `RESEND_FROM_ADDRESS` | `src/services/EmailService.ts:25` | Defaults to `SoundCheck <noreply@resend.dev>` |
| `FOURSQUARE_API_KEY` | `src/services/FoursquareService.ts:46` | Foursquare venue integration disabled |
| `GOOGLE_CLIENT_ID` | `src/services/SocialAuthService.ts:44` | Google sign-in fails |
| `APPLE_BUNDLE_ID` | `src/services/SocialAuthService.ts:104` | Apple sign-in throws error |
| `MUSICBRAINZ_USER_AGENT` | `src/services/MusicBrainzService.ts:41` | Defaults to `SoundCheck/1.0` |
| `BASE_URL` | `src/controllers/UserController.ts:472`, `src/controllers/ShareController.ts:249,341`, `src/controllers/WrappedController.ts:129` | Share links/wrapped pages use `localhost` fallback |
| `APP_STORE_URL` | `src/controllers/ShareController.ts:251,343`, `src/controllers/WrappedController.ts:130` | Defaults to `#` |
| `PLAY_STORE_URL` | `src/controllers/ShareController.ts:252,344`, `src/controllers/WrappedController.ts:131` | Defaults to `#` |
| `R2_PUBLIC_URL` | `src/services/R2Service.ts:38`, `src/services/CheckinService.ts:302` | Photo public URLs empty string |
| `JWT_EXPIRES_IN` | `src/utils/auth.ts:23` | Defaults to `7d` |

### What Needs to Change

Configure these in Railway dashboard (Environment Variables tab):

**Tier 1 -- Required for core functionality:**
1. `NODE_ENV=production`
2. `JWT_SECRET=<new rotated value>`
3. `DATABASE_URL` -- Railway should auto-inject this from PostgreSQL plugin
4. `REDIS_URL` -- Railway Redis plugin should provide this
5. `FIREBASE_SERVICE_ACCOUNT_JSON` -- Single-line JSON of Firebase service account
6. `CLOUDFLARE_ACCOUNT_ID` + `R2_ACCESS_KEY_ID` + `R2_SECRET_ACCESS_KEY` + `R2_BUCKET_NAME`
7. `R2_PUBLIC_URL` -- Without this, photo URLs will be empty strings even if upload works
8. `REVENUECAT_WEBHOOK_AUTH` -- Shared secret with RevenueCat dashboard

**Tier 2 -- Important for full feature set:**
9. `TICKETMASTER_API_KEY`
10. `SETLISTFM_API_KEY=<new rotated value>`
11. `SENTRY_DSN`
12. `RESEND_API_KEY` + `RESEND_FROM_ADDRESS`
13. `GOOGLE_CLIENT_ID` + `APPLE_BUNDLE_ID` -- For social auth
14. `BASE_URL` -- e.g., `https://soundcheck-production.up.railway.app`
15. `CORS_ORIGIN` -- Required when NODE_ENV=production for browser clients

**Tier 3 -- Optional / has good defaults:**
16. `ENABLE_WEBSOCKET=true` (if desired)
17. `FOURSQUARE_API_KEY`
18. `MUSICBRAINZ_USER_AGENT`
19. `APP_STORE_URL` + `PLAY_STORE_URL`

---

## BETA-04: Trust Proxy Configuration

### Current State

**There is NO `trust proxy` setting anywhere in the codebase.** Grep for `trust.proxy` and `trust proxy` across the entire backend returns zero results.

The Express app is created at `backend/src/index.ts:78`:
```typescript
const app = express();
```

No `app.set('trust proxy', ...)` call exists.

### Where req.ip Is Used (All Broken Behind Proxy)

| File | Line | Code | Purpose |
|------|------|------|---------|
| `src/middleware/auth.ts` | 222 | `const clientIP = req.ip \|\| req.socket.remoteAddress \|\| 'unknown'` | IP-based rate limiting (auth middleware) |
| `src/middleware/perUserRateLimit.ts` | 78 | `const ip = req.ip \|\| req.connection.remoteAddress \|\| 'unknown'` | Per-user rate limiting fallback to IP |
| `src/utils/redisRateLimiter.ts` | 157 | `const clientIP = req.ip \|\| req.socket.remoteAddress \|\| 'unknown'` | Redis-based rate limiting |
| `src/controllers/ConsentController.ts` | 216-224 | Manual `x-forwarded-for` parsing | GDPR consent IP logging |

### How Rate Limiting Works (and Why It's Broken)

The rate limiting middleware at `src/middleware/auth.ts:220-267` uses `req.ip` to identify clients:

```typescript
export const rateLimit = (windowMs, maxRequests) => {
  return async (req, res, next) => {
    const clientIP = req.ip || req.socket.remoteAddress || 'unknown';
    // ... rate limit by clientIP
  };
};
```

**Without `trust proxy`:**
- `req.ip` returns the Railway reverse proxy's IP address (same for ALL users)
- ALL users share a single rate limit bucket
- One user hitting the limit blocks EVERY user
- This applies to all 20+ route files that use `rateLimit()` or `createPerUserRateLimit()`

### Routes Using Rate Limiting (All Affected)

Rate limiting is applied across the entire API surface:

| Route File | Rate Limits Applied |
|------------|---------------------|
| `userRoutes.ts` | 5/15min (auth), 30/15min (general) |
| `socialAuthRoutes.ts` | 5/15min (auth) |
| `tokenRoutes.ts` | 10/15min |
| `passwordResetRoutes.ts` | Per-user rate limit |
| `reviewRoutes.ts` | 100/15min (read), 20/15min (create) |
| `venueRoutes.ts` | 100/15min (read), 10/15min (create) |
| `bandRoutes.ts` | 100/15min (read), 10/15min (create) |
| `checkinRoutes.ts` | 10/day daily check-in limit |
| `searchRoutes.ts` | 60/15min |
| `badgeRoutes.ts` | 100/15min (general), 10/15min (badge check) |
| `followRoutes.ts` | 30/15min |
| `wishlistRoutes.ts` | 30/15min |
| `blockRoutes.ts` | 30/15min (block), 100/15min (read) |
| `rsvpRoutes.ts` | 60/15min (RSVP), 100/15min (read) |
| `onboardingRoutes.ts` | 30/15min (write), 100/15min (read) |
| `trendingRoutes.ts` | 60/15min |
| `consentRoutes.ts` | 30/15min |
| `dataExportRoutes.ts` | 1/5min |

### The ConsentController Workaround

Interestingly, `src/controllers/ConsentController.ts:215-225` manually parses `x-forwarded-for`:

```typescript
const forwarded = req.headers['x-forwarded-for'];
if (forwarded) {
  const ips = typeof forwarded === 'string' ? forwarded : forwarded[0];
  return ips.split(',')[0].trim();
}
return req.ip || req.socket?.remoteAddress || undefined;
```

This is a local workaround for the missing `trust proxy` setting. Once `trust proxy` is configured properly, `req.ip` will automatically use `x-forwarded-for`, making this manual parsing redundant (but harmless).

### What Needs to Change

Add ONE line after the Express app is created at `backend/src/index.ts:78`:

```typescript
const app = express();
app.set('trust proxy', 1);  // Trust first proxy (Railway)
```

**Why `1` and not `true`?**
- `1` means "trust the first hop" -- exactly what Railway provides (one reverse proxy layer)
- `true` trusts ALL proxies in `X-Forwarded-For`, which can be spoofed by clients adding extra entries
- `'loopback'` is too restrictive for Railway (proxy is not on localhost)

**After this change:**
- `req.ip` returns the real client IP from `X-Forwarded-For`
- `req.protocol` returns the correct protocol from `X-Forwarded-Proto`
- `req.hostname` returns the correct host from `X-Forwarded-Host`
- Rate limiting works correctly per-client instead of per-proxy
- The ConsentController workaround becomes redundant but still works

### Risks

- **IP spoofing**: With `trust proxy: 1`, clients CANNOT spoof their IP by adding `X-Forwarded-For` headers -- Express only trusts the rightmost IP added by the immediate proxy (Railway). This is secure.
- **Multiple proxy layers**: If Railway ever adds a second proxy layer (CDN, etc.), change to `2`. For now, `1` is correct.
- **Zero code risk for rate limiting**: The rate limiting code already uses `req.ip` -- it will automatically get correct IPs after this one-line change.

---

## Cross-Cutting Concerns

### Railway Deployment Configuration

Current deployment setup from `railway.toml`:
```toml
[build]
builder = "NIXPACKS"
watchPaths = ["backend/**"]

[deploy]
startCommand = "cd backend && npm start"
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10
```

The `nixpacks.toml` uses Node.js 20 and builds from the `backend/` subdirectory. No environment variables are set in these config files -- they must be set in Railway's dashboard.

### Express Version

Running Express `^4.21.2` (from `package.json`). The `trust proxy` setting is stable and well-documented in Express 4.x. No version-specific concerns.

### Security Middleware Already In Place

The codebase already has good security foundations:
- `helmet` configured with CSP, HSTS, etc. (`src/index.ts:82-104`)
- CORS properly rejects wildcards in production mode (`src/index.ts:124-127`)
- JWT validation with user existence check (`src/middleware/auth.ts:14-67`)
- Rate limiting on all routes (just needs correct IPs)
- Sentry scrubs authorization headers (`src/utils/sentry.ts:36-39`)

---

## Sources

### Primary (HIGH confidence)
- Direct source code inspection of `backend/src/` directory
- `backend/.env` file contents (on-disk, not committed)
- `backend/.env.example` template
- Git history via `git log --all -p -- backend/.env`
- `.gitignore` contents
- `railway.toml` and `nixpacks.toml` deployment configuration

### Confidence Breakdown

| Area | Level | Reason |
|------|-------|--------|
| BETA-01 (Secrets) | HIGH | Direct inspection of .env file and git history |
| BETA-02 (NODE_ENV) | HIGH | Every NODE_ENV check traced in source code |
| BETA-03 (Env vars) | HIGH | Comprehensive grep of all process.env references |
| BETA-04 (Trust proxy) | HIGH | Confirmed zero trust proxy config; Express 4.x behavior well-documented |

**Research date:** 2026-03-01
**Valid until:** 2026-03-31 (stable domain, no fast-moving libraries involved)
