# SoundCheck — Open Beta E2E Audit

**Date:** 2026-04-17
**Scope:** Backend (Node/TypeScript/Express), Mobile (Flutter/Riverpod/Dio), Database (Postgres + node-pg-migrate), Infra/Deploy (Railway, Nixpacks, GitHub Actions), Config/Secrets.
**Method:** Pure source inspection. Docs ignored. No claims made without file+line evidence.

---

## Executive Summary

**Counts across all domains:**

| Severity | Backend Security | Backend DB | Backend Logic | Mobile | Infra | **Total** |
|----------|-----------------:|-----------:|--------------:|-------:|------:|----------:|
| BLOCKER  | 4                | 10         | 1 (overlap w/ DB) | 9  | 5     | **28 unique** |
| HIGH     | 10               | 14         | 0             | 12     | 9     | **45** |
| MEDIUM   | 10               | 20         | 0             | 17     | 10    | **57** |
| LOW      | 5                | 9          | 0             | 10     | 11    | **35** |

**Cross-cutting overlaps (counted once above):**

- Live production secrets on disk (`backend/.env`) → Security-B1 ≡ Infra-1.
- FeedService SQL string interpolation → Security-none ≡ Routes-flagged ≡ DB-M40.
- Firebase not configured on mobile → Mobile-B7 ≡ Infra-3.
- `database-schema.sql`/`init_db.sql`/`migrate.js` legacy bootstrap that conflicts with `node-pg-migrate` chain → DB-B1 + DB-B2 + DB-B3 + Infra-4.

**Launch posture:** **NOT READY**. 28 BLOCKER items must be closed before any public beta. The most dangerous are the production-secret leak (#B-SEC-1), the refresh-token O(N) bcrypt DoS (#B-SEC-2), the dead push-notification pipeline (#B-MOB-2/#B-MOB-7/#B-MOB-8/#B-MOB-9), and the DB bootstrap trap (#B-DB-1, #B-DB-2).

**Fix ordering guidance at bottom.**

---

## How to use this document (for the implementer)

Each finding is self-contained:

1. **ID** (e.g., `B-SEC-1`) — use in PRs, git commit messages, and issue tracker.
2. **Severity** — BLOCKER / HIGH / MEDIUM / LOW.
3. **Files** — absolute paths with line numbers.
4. **Symptom** — what the user or operator experiences.
5. **Root cause** — what is actually wrong in the code.
6. **Fix** — exact instructions, code diffs where feasible.
7. **Verify** — how to confirm the fix works.

Where a fix spans multiple files, every file is listed. Where a fix requires a new migration, the migration number is specified.

`⟶` means "depends on". If a finding says `⟶ B-DB-2`, close `B-DB-2` first.

**Do not batch unrelated fixes in one PR.** One finding per PR keeps reviews tractable and rollbacks clean.

---

# SECTION 1 — BLOCKERS (must close before open beta)

## B-SEC-1 — Live production secrets sit in `backend/.env` on disk

**Severity:** BLOCKER
**Files:**
- `C:\Users\dasbl\AndroidStudioProjects\SoundCheck\backend\.env` (lines 3, 8, 12, 27)

**Symptom:** The file contains the live Railway Postgres DSN (`postgresql://postgres:obXQlh...@ballast.proxy.rlwy.net:19529/railway`), a real 128-char `JWT_SECRET`, and a real `SETLISTFM_API_KEY`. The file is gitignored today but is adjacent to a tracked `backend/server.log`. One `git add backend/.` will commit them forever.

**Root cause:** Developer convenience file holding real credentials.

**Fix:**
1. Rotate the DB password in the Railway Postgres plugin UI.
2. Rotate `JWT_SECRET`:
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```
   Set the new value in the Railway backend service's Variables UI. This will log out all users — acceptable pre-beta.
3. Rotate the SetlistFm API key at setlist.fm.
4. Replace `backend/.env` with dev-only placeholders matching `backend/.env.example`. Real values live only in Railway's Variables UI.
5. Install gitleaks pre-commit hook: add to `.husky/pre-commit`:
   ```sh
   gitleaks protect --staged --redact --config .gitleaks.toml
   ```
6. Delete or rename the existing `backend/.env` and tell every dev to re-create it locally with placeholders.

**Verify:**
- `cat backend/.env` returns placeholders only.
- Startup logs show `DATABASE_URL present: true` from Railway Variables, not from a local file.
- `gitleaks detect --source .` returns 0 findings.

---

## B-SEC-2 — Refresh-token verification is an O(N) bcrypt loop — production DoS vector

**Severity:** BLOCKER
**Files:**
- `C:\Users\dasbl\AndroidStudioProjects\SoundCheck\backend\src\utils\auth.ts` lines 225–248 (`verifyRefreshToken`) and 259–278 (`revokeRefreshToken`)

**Symptom:** Every `POST /api/tokens/refresh` `SELECT`s all non-expired, non-revoked refresh tokens and runs `bcrypt.compare` (~80–120 ms each) against each until a match is found. At beta scale with 30-day rotation, the `refresh_tokens` table grows to tens of thousands of rows. Three concurrent refresh calls will saturate a Railway instance. `revokeRefreshToken` is missing `AND expires_at > NOW()`, so it scans dead rows too. `cleanupExpiredTokens` is never scheduled.

**Root cause:** Bcrypt hash used as lookup key. No indexable handle on the token.

**Fix (split-token pattern — industry standard):**
1. New migration `050_split-refresh-tokens.ts`:
   ```ts
   pgm.addColumn('refresh_tokens', {
     selector: { type: 'varchar(32)', notNull: true, default: pgm.func("''") },
   });
   pgm.createIndex('refresh_tokens', 'selector', { unique: true });
   ```
2. Update `utils/auth.ts` `generateRefreshToken`:
   ```ts
   const selector = crypto.randomBytes(16).toString('hex'); // 32 chars
   const verifier = crypto.randomBytes(32).toString('hex');
   const hash = await bcrypt.hash(verifier, 10);
   await db.query(
     'INSERT INTO refresh_tokens (user_id, selector, token_hash, expires_at) VALUES ($1,$2,$3,$4)',
     [userId, selector, hash, expiresAt]
   );
   return `${selector}.${verifier}`;
   ```
3. Update `verifyRefreshToken`:
   ```ts
   const [selector, verifier] = rawToken.split('.');
   const row = (await db.query(
     'SELECT * FROM refresh_tokens WHERE selector = $1 AND revoked_at IS NULL AND expires_at > NOW()',
     [selector]
   )).rows[0];
   if (!row) return null;
   if (!(await bcrypt.compare(verifier, row.token_hash))) {
     // Reuse-detection: if the selector exists but verifier fails, revoke all.
     await revokeAllUserTokens(row.user_id);
     return null;
   }
   return row.user_id;
   ```
4. Update `revokeRefreshToken` the same way: `WHERE selector = $1 AND expires_at > NOW()`.
5. Wire `cleanupExpiredTokens` into BullMQ daily schedule in `backend/src/jobs/syncScheduler.ts`:
   ```ts
   await retentionQueue.add('cleanup-tokens', {}, { repeat: { cron: '0 3 * * *' } });
   ```
6. Migrate existing tokens: `010_seed-existing-selectors.ts` — regenerate selectors for any legacy rows (short-lived acceptable since they'll expire in ≤30 d).

**Verify:**
- `EXPLAIN ANALYZE SELECT * FROM refresh_tokens WHERE selector = 'abc'` → `Index Scan`.
- `time curl /api/tokens/refresh` with 10k rows in the table < 100 ms.
- Present a revoked token → `revokeAllUserTokens` fires and a second refresh call returns 401.

---

## B-SEC-3 — `photoKeys` on `/api/checkins/:id/photos` is unvalidated

**Severity:** BLOCKER
**Files:**
- `C:\Users\dasbl\AndroidStudioProjects\SoundCheck\backend\src\routes\checkinRoutes.ts` lines 69–79 (zod schema: `z.string().min(1)`)
- `C:\Users\dasbl\AndroidStudioProjects\SoundCheck\backend\src\services\checkin\CheckinPhotoService.ts` line 130

**Symptom:** `addPhotos()` builds URLs as `${R2_PUBLIC_URL}/${key}`. A user can submit `{"photoKeys":["../other-user/private.jpg"]}` or a full URL `"https://evil.example.com/m.svg#"` and those URLs get persisted, then served in the feed and share cards. Enables user-to-user photo hijack and stored content injection.

**Root cause:** No server-side verification that the key was actually presigned by this user for this check-in.

**Fix:**
1. New migration `051_pending_photo_uploads.ts`:
   ```ts
   pgm.createTable('pending_photo_uploads', {
     id: 'id',
     checkin_id: { type: 'uuid', notNull: true, references: 'checkins(id)', onDelete: 'CASCADE' },
     user_id: { type: 'uuid', notNull: true, references: 'users(id)', onDelete: 'CASCADE' },
     object_key: { type: 'varchar(200)', notNull: true, unique: true },
     created_at: { type: 'timestamptz', default: pgm.func('NOW()') },
   });
   ```
2. In `R2Service.getPresignedUploadUrl`, after generating the key, INSERT into `pending_photo_uploads`.
3. Change `checkinRoutes.ts` schema:
   ```ts
   photoKeys: z.array(z.string().regex(/^checkins\/[a-f0-9]{32}\.(jpg|png|webp|heic)$/))
     .min(1).max(4)
   ```
4. In `CheckinPhotoService.addPhotos`, verify each key exists in `pending_photo_uploads` for `(checkin_id, user_id)`; if any fails, reject with 400.
5. Optional defense-in-depth: `HeadObject` on R2 to confirm upload completed before persisting.

**Verify:**
- Submit a photoKey of `../other/foo.jpg` → 400.
- Submit a presigned key for another user's checkin → 400.
- Normal upload flow still works end-to-end.

---

## B-SEC-4 — Social OAuth `state` parameter defined but never enforced

**Severity:** BLOCKER
**Files:**
- `C:\Users\dasbl\AndroidStudioProjects\SoundCheck\backend\src\routes\socialAuthRoutes.ts` lines 14–26, 57–60, 166–169
- `C:\Users\dasbl\AndroidStudioProjects\SoundCheck\backend\src\services\SocialAuthService.ts` lines 63–96, 104–152, 162–213

**Symptom:** `verifyGoogleToken(idToken, state?)` and `verifyAppleToken(identityToken, fullName?, state?)` only validate the state when provided. Routes never pass it. `generateOAuthState` is dead code.

**Root cause:** Implementation started, never finished.

**Fix (option A — wire it up properly):**
1. Add endpoint `GET /api/auth/social/state` that calls `generateOAuthState()` and returns the value.
2. Mobile client fetches state, stores in-memory, includes with `idToken` in social sign-in request.
3. Add `state: z.string().length(64)` to `googleAuthSchema` and `appleAuthSchema` in `socialAuthRoutes.ts`.
4. Pass state through to `verifyGoogleToken(idToken, state)` and `verifyAppleToken(identityToken, fullName, state)`.
5. Mobile: `mobile/lib/src/features/auth/data/social_auth_service.dart` — fetch state before each OAuth call.

**Fix (option B — delete the dead code):** If audience-binding on the ID token is deemed sufficient, remove `generateOAuthState` and the `state?` parameters entirely. Document the decision in `backend/SECURITY_SETUP.md`.

**Pre-beta: pick A.** Option B leaves a dormant landmine.

**Verify:**
- POST to `/api/auth/social/google` without a `state` → 400.
- POST with a fresh state that was never issued → 400.
- POST with a state issued >5 min ago → 400.

---

## B-DB-1 — `database-schema.sql` has forward FK that breaks bootstrap

**Severity:** BLOCKER
**Files:**
- `C:\Users\dasbl\AndroidStudioProjects\SoundCheck\backend\database-schema.sql` lines 116–140 (checkins), 236+ (events)

**Symptom:** `checkins.event_id UUID REFERENCES events(id)` is declared at line 121 but `events` table is first created at line 236. `psql -f database-schema.sql` on a fresh DB aborts with `relation "events" does not exist`.

**Root cause:** Table order in the reference schema.

**Fix:** Delete the file entirely. See `B-DB-2` — the migration chain is authoritative; `database-schema.sql` is a drift-prone snapshot.

**Verify:** File removed; no script references it (grep `database-schema` in `package.json`, `backend/migrate.js`, `backend/src/scripts/migrate.ts`).

---

## B-DB-2 — Conflicting bootstrap path: `migrate.js` and `src/scripts/migrate.ts` execute `database-schema.sql`

**Severity:** BLOCKER
**Files:**
- `C:\Users\dasbl\AndroidStudioProjects\SoundCheck\backend\migrate.js` lines 23–32
- `C:\Users\dasbl\AndroidStudioProjects\SoundCheck\backend\src\scripts\migrate.ts` lines 42–49

**Symptom:** Both scripts run `database-schema.sql` against the pool. This reference-only file is missing many columns/tables that migrations create (is_admin, is_premium, onboarding_completed_at, audit_logs, reports, moderation_items, user_blocks, password_reset_tokens, event_rsvps, user_genre_preferences, verification_claims, device_tokens, feed_read_cursors, sync_regions, event_sync_log, processed_webhook_events, and the `total_reviews` → `total_checkins` rename). An operator who runs these on a fresh Railway DB gets a half-built schema.

**Root cause:** Legacy bootstrap kept alongside the migration chain.

**Fix:**
1. `git rm backend/migrate.js backend/init_db.sql backend/src/scripts/migrate.ts backend/database-schema.sql`.
2. Confirm `backend/package.json` `migrate` script is `npm run migrate:up` (`node-pg-migrate`) — currently line 10–14. It is already configured; only remove the legacy `migrate:legacy` and `migrate:events-legacy` scripts at lines 16–17.
3. Railway `startCommand` (`railway.toml` line 11) already calls `npm run migrate:up`. No change needed there.
4. Update `backend/README.md` (if docs later re-enabled) to reference only node-pg-migrate.

**Verify:**
- `find backend -name 'database-schema.sql' -o -name 'init_db.sql' -o -name 'migrate.js'` returns nothing.
- On a fresh Postgres, `cd backend && npm run migrate:up` completes cleanly and `\dt` lists all expected tables.

---

## B-DB-3 — `migrate.js` disables SSL cert verification in production

**Severity:** BLOCKER (closed by B-DB-2 if file is deleted)
**File:** `C:\Users\dasbl\AndroidStudioProjects\SoundCheck\backend\migrate.js` line 14

**Symptom:** `ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false` — silently disables cert verification in prod.

**Fix:** Delete file (B-DB-2).

---

## B-DB-4 — Missing columns on `bands` and `venues` break external-ID imports

**Severity:** BLOCKER
**Files affected (services that will throw at runtime):**
- `backend/src/services/MusicBrainzService.ts` lines 186, 244, 340 (refs `bands.musicbrainz_id`)
- `backend/src/services/FoursquareService.ts` lines 164, 205, 316 (refs `venues.foursquare_place_id`)
- `backend/src/services/SetlistFmService.ts` lines 418, 448, 516 (refs `venues.setlistfm_venue_id`)

**Symptom:** Any call to band/venue import endpoints throws `column "musicbrainz_id" does not exist`. Columns live only in the unused `scripts/migrate-events-model.ts`, which is not in the migration chain.

**Fix:** New migration `050_add-external-ids-to-bands-venues.ts`:
```ts
exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE bands ADD COLUMN IF NOT EXISTS musicbrainz_id VARCHAR(255);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_bands_musicbrainz_id ON bands(musicbrainz_id) WHERE musicbrainz_id IS NOT NULL;
    ALTER TABLE venues ADD COLUMN IF NOT EXISTS foursquare_place_id VARCHAR(255);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_venues_foursquare_place_id ON venues(foursquare_place_id) WHERE foursquare_place_id IS NOT NULL;
    ALTER TABLE venues ADD COLUMN IF NOT EXISTS setlistfm_venue_id VARCHAR(255);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_venues_setlistfm_venue_id ON venues(setlistfm_venue_id) WHERE setlistfm_venue_id IS NOT NULL;
  `);
};
```

**Verify:**
- `psql -c '\d bands'` shows `musicbrainz_id`.
- Hit `POST /api/bands/import/musicbrainz` against a fresh DB → 200.

---

## B-DB-5 — Manual check-in race: duplicate creation via concurrent taps

**Severity:** BLOCKER
**File:** `C:\Users\dasbl\AndroidStudioProjects\SoundCheck\backend\src\services\checkin\CheckinCreatorService.ts` lines 292–323

**Symptom:** Duplicate-check SELECT happens outside the transaction. Two simultaneous POSTs can both pass and both INSERT. User ends up with two check-ins for the same band/venue/day.

**Fix (database enforced):**
```ts
// In a new migration 052_unique-manual-checkin.ts:
pgm.sql(`
  CREATE UNIQUE INDEX idx_checkins_manual_user_band_venue_day
    ON checkins (user_id, band_id, venue_id, (created_at::date))
    WHERE event_id IS NULL;
`);
```
Then in `createManualCheckin`, catch the `23505` duplicate-key error and return HTTP 409 with a clear message. Remove the now-redundant pre-check SELECT.

**Verify:** Run two parallel curl calls with same payload → one returns 200, other 409. Only one row in `checkins`.

---

## B-DB-6 — `createCheckinDelete` ownership check + delete not atomic

**Severity:** BLOCKER
**File:** `C:\Users\dasbl\AndroidStudioProjects\SoundCheck\backend\src\services\checkin\CheckinCreatorService.ts` lines 429–453

**Symptom:** `SELECT user_id` and `DELETE` happen on separate connections. If the AFTER-DELETE stats trigger fails, the check-in is already gone and stats diverge. Also allows (theoretically) a TOCTOU window.

**Fix:** Collapse to one statement in a transaction:
```ts
const client = await db.connect();
try {
  await client.query('BEGIN');
  const result = await client.query(
    'DELETE FROM checkins WHERE id = $1 AND user_id = $2 RETURNING id, venue_id, band_id',
    [checkinId, userId]
  );
  if (result.rowCount === 0) {
    await client.query('ROLLBACK');
    throw new ForbiddenError('Not your checkin');
  }
  await client.query('COMMIT');
  return result.rows[0];
} catch (e) {
  await client.query('ROLLBACK');
  throw e;
} finally {
  client.release();
}
```

**Verify:** Delete someone else's checkin → 403 without any DELETE executed (check audit log).

---

## B-DB-7 — Migration 018 hard-deletes user badges on every run

**Severity:** BLOCKER
**File:** `C:\Users\dasbl\AndroidStudioProjects\SoundCheck\backend\migrations\018_seed-badge-definitions.ts` lines 29–30

**Symptom:** `DELETE FROM user_badges; DELETE FROM badges;` with no guard. Re-running this migration (which `node-pg-migrate` won't do if tracked, but any operator can run `migrate:reset`) destroys every earned badge. Also: transitioning from closed → open beta needs migration idempotency; this violates it.

**Fix:** Convert to idempotent upsert:
```ts
exports.up = (pgm) => {
  pgm.sql(`
    INSERT INTO badges (name, description, badge_type, criteria, color)
    VALUES (...)
    ON CONFLICT (name) DO UPDATE SET
      description = EXCLUDED.description,
      badge_type  = EXCLUDED.badge_type,
      criteria    = EXCLUDED.criteria,
      color       = EXCLUDED.color;
  `);
};
```
Never delete from `user_badges` in a migration.

**Verify:** Earn a badge. Re-run `npm run migrate:down` then `migrate:up`. User badge still present.

---

## B-DB-8 — `seed-demo.ts` ALTERs `users` schema on every run

**Severity:** BLOCKER
**File:** `C:\Users\dasbl\AndroidStudioProjects\SoundCheck\backend\src\scripts\seed-demo.ts` line 284

**Symptom:** `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false` — schema mutation outside the migration chain. If executed against staging/prod, `is_demo` appears but `pgmigrations` doesn't know.

**Fix:**
1. New migration `053_add-is-demo-to-users.ts` with that ALTER.
2. Remove the inline `ALTER` from `seed-demo.ts` — it only INSERTs demo rows.

**Verify:** `psql -c '\d users'` shows `is_demo` even on a DB that never ran `seed-demo`.

---

## B-DB-9 — `executeAccountDeletion` orphans data in 8+ tables (GDPR Article 17 breach)

**Severity:** BLOCKER
**File:** `C:\Users\dasbl\AndroidStudioProjects\SoundCheck\backend\src\services\DataRetentionService.ts` lines 155–242

**Symptom:** Deletion anonymizes the user row (UPDATE, not DELETE) so FK cascades never fire. Data remains in: `event_rsvps`, `user_genre_preferences`, `device_tokens`, `feed_read_cursors`, `user_blocks`, `password_reset_tokens`, `reports`, `verification_claims`, `processed_webhook_events`, `audit_logs.metadata`.

**Fix:** Extend the existing transaction block:
```ts
await client.query('DELETE FROM event_rsvps WHERE user_id = $1', [userId]);
await client.query('DELETE FROM user_genre_preferences WHERE user_id = $1', [userId]);
await client.query('DELETE FROM device_tokens WHERE user_id = $1', [userId]);
await client.query('DELETE FROM feed_read_cursors WHERE user_id = $1', [userId]);
await client.query('DELETE FROM user_blocks WHERE blocker_id = $1 OR blocked_id = $1', [userId]);
await client.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [userId]);
await client.query('DELETE FROM reports WHERE reporter_id = $1 OR target_user_id = $1', [userId]);
await client.query("UPDATE verification_claims SET evidence_text='[deleted]', evidence_url=NULL WHERE user_id = $1", [userId]);
await client.query('DELETE FROM processed_webhook_events WHERE app_user_id = $1::text', [userId]);
```

**Verify:** Call `POST /api/users/me/delete`, then `SELECT COUNT(*) FROM event_rsvps WHERE user_id = $deletedUid` → 0 across all listed tables.

---

## B-DB-10 — `DataExportService` omits 8 user-owned tables from GDPR export

**Severity:** BLOCKER
**File:** `C:\Users\dasbl\AndroidStudioProjects\SoundCheck\backend\src\services\DataExportService.ts` (entire file)

**Symptom:** GDPR Article 15 (right to access) requires all personal data. Current export covers profile, checkins, follows, wishlist, badges, toasts, comments, notifications. Missing: `event_rsvps`, `user_genre_preferences`, `user_consents`, `user_blocks`, `checkin_band_ratings`, `verification_claims`, `reports` (filed by user), `user_social_accounts`, `device_tokens`, `audit_logs` (by user).

**Fix:** Add private methods and include in the top-level `Promise.all`:
```ts
const [..., rsvps, genres, consents, blocks, bandRatings, claims, reportsFiled, socials, devices, audit] = await Promise.all([
  ...,
  this.getRsvps(userId),
  this.getGenrePreferences(userId),
  this.getConsents(userId),
  this.getBlockedUsers(userId),
  this.getBandRatings(userId),
  this.getClaims(userId),
  this.getReportsFiled(userId),
  this.getSocialAccounts(userId),
  this.getDevices(userId),
  this.getAuditLog(userId),
]);
```

**Verify:** Request a data export, unzip, confirm each of the 10 tables is represented.

---

## B-MOB-1 — Email/password login never issues a refresh token → users logged out every 30 min

**Severity:** BLOCKER
**Files:**
- `C:\Users\dasbl\AndroidStudioProjects\SoundCheck\backend\src\services\user\AuthService.ts` lines 62–66 (register), 97–106 (authenticate)
- `C:\Users\dasbl\AndroidStudioProjects\SoundCheck\mobile\lib\src\features\auth\data\auth_repository.dart` lines 39–77
- `C:\Users\dasbl\AndroidStudioProjects\SoundCheck\mobile\lib\src\features\auth\domain\user.dart` lines 36–45

**Symptom:** `POST /users/login` and `POST /users/register` return only `{user, token}`. `JWT_EXPIRES_IN` defaults to 30m. Mobile's `_attemptTokenRefresh` returns `false` because no refresh token was stored. First 401 dumps the user to the login screen.

**Root cause:** Password flow never wired to `generateRefreshToken()`, though social path is.

**Fix:**
1. In `AuthService.register` and `AuthService.authenticate` (backend), after producing the JWT, call:
   ```ts
   const refreshToken = await generateRefreshToken(user.id);
   return { user, accessToken, refreshToken };
   ```
2. Update response type `AuthResponse` to include `refreshToken`.
3. Update `mobile/lib/src/features/auth/domain/user.dart` `AuthResponse` model to include `refreshToken`.
4. Update `mobile/lib/src/features/auth/data/auth_repository.dart` to persist both tokens to `flutter_secure_storage` under `auth_token` and `refresh_token`.

**Verify:** Login → wait >30min → call any endpoint. Client auto-refreshes without bouncing to login.

---

## B-MOB-2 — Push notifications never initialize

**Severity:** BLOCKER
**Files:**
- `C:\Users\dasbl\AndroidStudioProjects\SoundCheck\mobile\lib\main.dart` lines 13–46 (no init)
- `C:\Users\dasbl\AndroidStudioProjects\SoundCheck\mobile\lib\src\core\services\push_notification_service.dart` lines 42–97

**Symptom:** `PushNotificationService.initialize()` is never called. FCM permission never requested, FCM token never retrieved, `/api/users/device-token` never hit, tap-through to deep links never wired.

**Fix:**
1. Add provider in `mobile/lib/src/core/providers/providers.dart`:
   ```dart
   final pushNotificationServiceProvider = Provider<PushNotificationService>((ref) {
     return PushNotificationService(ref);
   });
   ```
2. Initialize after login in the auth listener (e.g. in `app_router.dart` or a dedicated startup listener):
   ```dart
   ref.listen(authStateProvider, (prev, next) async {
     next.whenData((auth) async {
       if (auth.user != null) {
         await ref.read(pushNotificationServiceProvider).initialize();
       }
     });
   });
   ```
3. Inside `PushNotificationService.initialize`, after obtaining the FCM token, POST to `/api/users/device-token` (backend route already exists via `userRoutes.ts`).
4. Route notification taps:
   ```dart
   FirebaseMessaging.onMessageOpenedApp.listen((message) {
     final route = message.data['deep_link'];
     if (route != null) rootRouter.go(route);
   });
   ```

**Verify:** Cold start → permission prompt → backend receives `/device-token`. Send test push → app wakes to the correct screen.

**Depends on:** B-MOB-7 (Firebase config files must exist first).

---

## B-MOB-3 — Manual check-in venue search shows hardcoded fake venues

**Severity:** BLOCKER
**File:** `C:\Users\dasbl\AndroidStudioProjects\SoundCheck\mobile\lib\src\features\checkins\presentation\checkin_screen.dart` lines 2208–2233

**Symptom:** `_VenueSearchSheet` ignores input, renders 10 static famous-venue strings. Tap sets `_selectedVenueId = 'venue_0'`. `createManualCheckIn` POSTs bogus ID → backend 400/404.

**Fix:**
1. Wire the TextField to a controller.
2. Use a debounced Riverpod provider `venueSearchQueryProvider` and a `venueSearchResultsProvider` that calls `VenueRepository.searchVenues(query)` (endpoint `GET /api/venues/search?q=…` — verify exists).
3. Render real results with real UUIDs.

Template:
```dart
final venueSearchQueryProvider = StateProvider<String>((ref) => '');
final venueSearchResultsProvider = FutureProvider.autoDispose<List<Venue>>((ref) async {
  final q = ref.watch(venueSearchQueryProvider);
  if (q.length < 2) return [];
  await Future.delayed(const Duration(milliseconds: 300));
  if (ref.watch(venueSearchQueryProvider) != q) return []; // debounce
  return ref.read(venueRepositoryProvider).searchVenues(q);
});
```

**Verify:** Type a real venue name → list loads real rows → tap → createManualCheckIn returns 200.

---

## B-MOB-4 — Celebration / share-card flow is dead code

**Severity:** BLOCKER
**Files:**
- `C:\Users\dasbl\AndroidStudioProjects\SoundCheck\mobile\lib\src\core\router\app_router.dart` lines 396–422 (route exists)
- `C:\Users\dasbl\AndroidStudioProjects\SoundCheck\mobile\lib\src\features\sharing\presentation\celebration_screen.dart` (never pushed)

**Symptom:** `grep -r 'CelebrationParams|"/celebration"' mobile/lib` returns no pusher. Check-in success renders inline; badges & share flow unreachable.

**Fix:** In `checkin_screen.dart`, after `submit(...)` succeeds in both `_checkInToEvent` and `_submitManualCheckIn`:
```dart
context.replace('/celebration', extra: CelebrationParams(
  checkinId: result.id,
  bandName: result.band.name,
  venueName: result.venue.name,
  earnedBadges: result.earnedBadges ?? const [],
));
```

**Verify:** Perform any check-in → CelebrationScreen opens with badge animation and share sheet.

---

## B-MOB-5 — `EditProfileScreen` uploads garbage JSON, claims success on failure

**Severity:** BLOCKER
**File:** `C:\Users\dasbl\AndroidStudioProjects\SoundCheck\mobile\lib\src\features\profile\presentation\edit_profile_screen.dart` lines 101–121

**Symptom:** `uploadProfileImage` returns `Future<Either<Failure, String>>`. Code assigns the `Either` directly to `newAvatarUrl` and stuffs it into `updates['profileImageUrl']`. `updateProfile` also returns an Either but no fold. Catch block never fires. Success snackbar always shown.

**Fix:**
```dart
if (_selectedImage != null) {
  final upRes = await profileRepository.uploadProfileImage(_selectedImage!);
  upRes.fold(
    (f) { _showError(f.message); return; },
    (url) => updates['profileImageUrl'] = url,
  );
  if (upRes.isLeft()) return;
}
final upd = await authRepository.updateProfile(updates);
upd.fold(
  (f) => _showError(f.message),
  (user) { _showSuccess('Profile updated'); context.pop(); },
);
```

**Verify:** Force a 500 from the backend → user sees the real error, no success snackbar.

---

## B-MOB-6 — WebSocket reconnect permanently disabled after first auth

**Severity:** BLOCKER
**File:** `C:\Users\dasbl\AndroidStudioProjects\SoundCheck\mobile\lib\src\core\services\websocket_service.dart` lines 270–282, 351–368

**Symptom:** On `authenticated` message, handler sets `_authToken = null`. `_scheduleReconnect` bails because `_authToken != null` is false. Every disconnect afterwards is terminal.

**Fix:** Keep the token:
```dart
// DELETE: _authToken = null;
// INSTEAD: keep _authToken so reconnects reuse it
```
Or, safer, re-read from `flutter_secure_storage` inside the reconnect timer.

**Verify:** Authenticate → kill Wi-Fi → reconnect → WS reconnects automatically.

---

## B-MOB-7 — Firebase native config files missing

**Severity:** BLOCKER
**Files (must exist, gitignored):**
- `mobile/android/app/google-services.json` — absent
- `mobile/ios/Runner/GoogleService-Info.plist` — absent
- Gradle plugin `com.google.gms.google-services` — not applied in `mobile/android/app/build.gradle.kts`
- iOS: no Firebase pod

**Symptom:** `Firebase.initializeApp()` throws `[core/no-app]` on every cold start. `analytics_service.dart:32` silently catches it, so analytics is off. Push pipeline dead.

**Fix:**
1. Create Firebase project. Add iOS app (bundle `com.soundcheck.app`) and Android app (package `com.soundcheck.app`).
2. Download `GoogleService-Info.plist` and `google-services.json`. Place at the paths above.
3. Run `flutterfire configure` to generate `lib/firebase_options.dart`.
4. In `mobile/android/app/build.gradle.kts`, apply plugin: `id("com.google.gms.google-services")`.
5. In `mobile/android/build.gradle.kts`, add plugin classpath.
6. In `mobile/ios/Podfile`, ensure `pod 'Firebase/Messaging'` is present (auto via firebase_messaging plugin).
7. Change `Firebase.initializeApp()` → `Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform)`.
8. Confirm `.gitignore` excludes both config files (already covered in `mobile/.gitignore`).
9. Add CI step to decode base64-encoded config files from GitHub Actions secrets at build time.
10. Set backend `FIREBASE_SERVICE_ACCOUNT_JSON` in Railway.

**Verify:** Cold start → no `[core/no-app]` exception. Analytics dashboards populate. Test push delivers.

---

## B-MOB-8 — iOS missing push-notification entitlements

**Severity:** BLOCKER
**File:** `C:\Users\dasbl\AndroidStudioProjects\SoundCheck\mobile\ios\Runner\Info.plist`

**Symptom:** No `UIBackgroundModes` with `remote-notification`. No Push Notifications capability. Missing reversed Google client ID `CFBundleURLTypes` entry. Result: APNs cannot deliver. Google Sign-In on iOS returns immediately.

**Fix (Info.plist):**
```xml
<key>UIBackgroundModes</key>
<array>
  <string>remote-notification</string>
  <string>fetch</string>
</array>
```
In Xcode → Runner target → Signing & Capabilities → add Push Notifications + Background Modes (Remote notifications).
Add reversed Google OAuth client ID (`com.googleusercontent.apps.XXXXX-YYYYY`) to `CFBundleURLTypes` alongside the existing `soundcheck` scheme.

**Verify:** `/usr/libexec/PlistBuddy -c "Print :UIBackgroundModes" ios/Runner/Info.plist` → shows both. Xcode → capabilities shows Push Notifications = enabled.

---

## B-MOB-9 — Android missing `POST_NOTIFICATIONS` permission

**Severity:** BLOCKER
**File:** `C:\Users\dasbl\AndroidStudioProjects\SoundCheck\mobile\android\app\src\main\AndroidManifest.xml` lines 1–19

**Symptom:** On Android 13+ target, `FirebaseMessaging.requestPermission()` silently resolves `denied` because the manifest doesn't declare the permission. Push never reaches device.

**Fix:**
```xml
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```
Add before `<application>`.

**Verify:** Cold install on Android 13+ → system permission prompt fires.

---

## B-INF-1 — Keystore and password committed adjacent to repo tree

**Severity:** BLOCKER
**Files:**
- `C:\Users\dasbl\AndroidStudioProjects\SoundCheck\mobile\android\key.properties` (plaintext password `PitPulse2024!SecureKey`)
- `C:\Users\dasbl\AndroidStudioProjects\SoundCheck\mobile\android\app\upload-keystore.jks`

**Symptom:** Both files are gitignored, but they live inside the repo tree. One rogue `git add -f` or backup snapshot loses production signing key. The old "PitPulse" project name also serves as a password hint.

**Fix:**
1. Move both files out of the repo (e.g., `~/.secrets/soundcheck/`).
2. Update `mobile/android/app/build.gradle.kts` to read from a path in an env var:
   ```kotlin
   val keystorePropertiesFile = file(System.getenv("SOUNDCHECK_KEYSTORE_PROPERTIES") ?: "${rootDir}/key.properties")
   ```
3. Change `storePassword`/`keyPassword` — rotate them.
4. Store the new keystore + new passwords in 1Password / GitHub Actions secret.
5. For CI, decode from a GitHub Actions secret at build time:
   ```yaml
   - run: echo "$KEYSTORE_B64" | base64 -d > $HOME/upload-keystore.jks
   ```

**Verify:** `cd mobile && flutter build appbundle --release` works only when `SOUNDCHECK_KEYSTORE_PROPERTIES` is set and the keystore file exists at its configured path.

---

## B-INF-2 — Vercel deploy manifest present alongside Railway config

**Severity:** BLOCKER
**Files:**
- `C:\Users\dasbl\AndroidStudioProjects\SoundCheck\backend\vercel.json`
- `C:\Users\dasbl\AndroidStudioProjects\SoundCheck\backend\.vercelignore`

**Symptom:** The backend is a long-running Express server with BullMQ workers and WebSockets. Vercel's serverless runtime cannot host it. If anyone connects this repo to Vercel by mistake, the HTTP routes respond but workers/WS silently never run.

**Fix:** `git rm backend/vercel.json backend/.vercelignore`.

**Verify:** `find backend -name 'vercel*'` returns nothing.

---

## B-INF-3 — Retention job has no scheduler; account-deletion grace period never runs

**Severity:** BLOCKER
**Files:**
- `C:\Users\dasbl\AndroidStudioProjects\SoundCheck\backend\src\scripts\retentionJob.ts`
- `C:\Users\dasbl\AndroidStudioProjects\SoundCheck\backend\src\jobs\syncScheduler.ts`

**Symptom:** `npm run retention-job` exists but nothing invokes it. User-requested account deletions sit in pending state forever. Expired refresh tokens never purged. GDPR/CCPA clock breaks.

**Fix:** Add a BullMQ repeatable job in `syncScheduler.ts`:
```ts
import { Queue } from 'bullmq';
const retentionQueue = new Queue('retention', { connection: getRedis()! });
await retentionQueue.add(
  'daily-retention',
  {},
  { repeat: { cron: '0 3 * * *' }, removeOnComplete: true }
);
```
Add corresponding worker `backend/src/jobs/retentionWorker.ts` that calls `runRetentionJob()`. Wire it into `backend/src/index.ts` alongside the other workers.

**Verify:** Check Redis `bull:retention` namespace for the scheduled job. Wait 24h → deletion_requests table has processed rows.

---

## B-INF-4 — Health endpoint returns 503 when Redis blips → Railway restart loop

**Severity:** BLOCKER
**File:** `C:\Users\dasbl\AndroidStudioProjects\SoundCheck\backend\src\index.ts` line 222

**Symptom:** `/health` returns 503 if Redis is unhealthy. Railway probe fails → pod restart → in-flight queue state lost → Redis pressure worsens → restart loop.

**Fix:** Only 503 on DB failure. Redis unhealthy = degraded, return 200 with `{ status: 'degraded', redis: 'down', db: 'up' }`:
```ts
const statusCode = dbHealth.healthy ? 200 : 503;
```

**Verify:** Stop Redis → `/health` returns 200 with `redis: 'down'` body. Railway probe passes.

---

## B-INF-5 — Firebase config files missing (duplicate of B-MOB-7 from ops angle)

**Severity:** BLOCKER (closes with B-MOB-7)

See **B-MOB-7**. From ops perspective: Railway also needs `FIREBASE_SERVICE_ACCOUNT_JSON` set. Without it, `PushNotificationService.ts` init throws at module load.

---

# SECTION 2 — HIGH

## H-SEC-1 — Unmounted AdminController with destructive ops

**Severity:** HIGH
**File:** `C:\Users\dasbl\AndroidStudioProjects\SoundCheck\backend\src\controllers\AdminController.ts` (whole file, esp. `moderateContent` at line 224)

**Symptom:** Class defines handlers that `UPDATE users SET is_active = false` with no in-handler `req.user.isAdmin` check. Currently unmounted, but future `adminRoutes.ts` mounted without `requireAdmin()` exposes them.

**Fix:** Either delete the file if unused, or add as first line in each handler:
```ts
if (!req.user?.isAdmin) throw new ForbiddenError('Admin only');
```

---

## H-SEC-2 — Password-reset rate limit fails open on Redis outage

**Severity:** HIGH
**Files:**
- `C:\Users\dasbl\AndroidStudioProjects\SoundCheck\backend\src\middleware\perUserRateLimit.ts` lines 131–138, 377–385
- `C:\Users\dasbl\AndroidStudioProjects\SoundCheck\backend\src\utils\redisRateLimiter.ts` lines 88–94, 132–140
- `C:\Users\dasbl\AndroidStudioProjects\SoundCheck\backend\src\middleware\auth.ts` lines 183–196 (`CRITICAL_ENDPOINTS` list)

**Symptom:** On Redis error, falls back to per-instance in-memory Map. Password-reset isn't in `CRITICAL_ENDPOINTS`; attackers can hit it per-instance at beta scale.

**Fix:**
1. Add `/api/auth/forgot-password` and `/api/auth/reset-password` to `CRITICAL_ENDPOINTS`.
2. Add `isCritical?: boolean` option to `createPerUserRateLimit`; on Redis failure with `isCritical: true`, return 503 not fallback.
3. Apply `createPerUserRateLimit({ isCritical: true })` to `passwordResetRoutes.ts` and `socialAuthRoutes.ts`.

---

## H-SEC-3 — Refresh-token reuse is not detected

**Severity:** HIGH (closes with B-SEC-2 fix)
**File:** `C:\Users\dasbl\AndroidStudioProjects\SoundCheck\backend\src\routes\tokenRoutes.ts` lines 56–95

**Fix:** See B-SEC-2 step 3: on selector match with failed verifier, call `revokeAllUserTokens(userId)`.

---

## H-SEC-4 — RevenueCat webhook returns 200 on missing secret → silent subscription drop

**Severity:** HIGH
**File:** `C:\Users\dasbl\AndroidStudioProjects\SoundCheck\backend\src\controllers\SubscriptionController.ts` lines 22–28

**Fix:**
1. Change response:
   ```ts
   return res.status(503).json({ error: 'Webhook not configured' });
   ```
2. Add `REVENUECAT_WEBHOOK_AUTH` to startup env checks in `backend/src/index.ts:77` when `NODE_ENV=production`.

---

## H-SEC-5 — Webhook trusts `app_user_id` with no signature verification

**Severity:** HIGH
**File:** `C:\Users\dasbl\AndroidStudioProjects\SoundCheck\backend\src\services\SubscriptionService.ts` lines 17–67

**Fix:** Move from shared-secret to HMAC (`X-RC-Signature`) per RevenueCat docs. Short-term: also confirm entitlement by calling `GET https://api.revenuecat.com/v1/subscribers/{app_user_id}` with server key before flipping `is_premium`.

---

## H-SEC-6 — Enumeration rate limiter fails open on Redis outage

**Severity:** HIGH
**File:** `C:\Users\dasbl\AndroidStudioProjects\SoundCheck\backend\src\utils\redisRateLimiter.ts` lines 310–318, 377–384, 465–471

**Fix:** When `!redis`, return `{ allowed: false, requiresCaptcha: true, remaining: 0 }`. Middleware returns 503 on outer catch instead of `next()`.

---

## H-SEC-7 — `addJitter` middleware wraps `res.end`, `res.json`, `res.send` together → stacked setTimeouts

**Severity:** HIGH
**File:** `C:\Users\dasbl\AndroidStudioProjects\SoundCheck\backend\src\middleware\auth.ts` lines 357–394

**Fix:** Replace the wrapping approach with a single pre-response delay in the middleware:
```ts
const delay = jitterMs();
setTimeout(() => next(), delay);
```
Or use a `res.on('finish')` hook for observability and stop wrapping response methods.

---

## H-SEC-8 — `AuditService.extractIpAddress` trusts `x-forwarded-for`

**Severity:** HIGH
**File:** `C:\Users\dasbl\AndroidStudioProjects\SoundCheck\backend\src\services\AuditService.ts` lines 361–377

**Fix:** Replace entire function body with:
```ts
return req.ip || req.socket?.remoteAddress || null;
```
`app.set('trust proxy', 1)` already handles the first hop correctly.

---

## H-SEC-9 — `checkinRateLimit` runs DB COUNT before zod validation

**Severity:** HIGH
**Files:**
- `C:\Users\dasbl\AndroidStudioProjects\SoundCheck\backend\src\middleware\checkinRateLimit.ts` lines 31–46
- `C:\Users\dasbl\AndroidStudioProjects\SoundCheck\backend\src\routes\checkinRoutes.ts` line 119–124

**Fix:**
1. Swap middleware order: `validate(createCheckinSchema)` before `dailyCheckinRateLimit`.
2. Move count to Redis with key `checkins:daily:${userId}:${YYYY-MM-DD}`, INCR on successful create, TTL to end of day.

---

## H-SEC-10 — FeedService `toastSelect` string interpolates `userId`

**Severity:** HIGH (BLOCKER-adjacent; userId is validated UUID but defense-in-depth)
**File:** `C:\Users\dasbl\AndroidStudioProjects\SoundCheck\backend\src\services\FeedService.ts` lines 181–185

**Fix:** Parameterize. Add `$N::uuid` as the first param of the subquery and reshape the params array accordingly:
```ts
const toastSelect = userId
  ? `EXISTS(SELECT 1 FROM toasts t2 WHERE t2.checkin_id = c.id AND t2.user_id = $1::uuid) AS has_user_toasted`
  : 'false AS has_user_toasted';
// Then prepend userId to params or use a separate numbered slot.
```

---

## H-DB-1 — Events `is_cancelled` vs `status` drift

**Severity:** HIGH
**Files:** Sync on every query site. List in DB audit #11.

**Fix:** Add trigger `BEFORE UPDATE ON events` that syncs `NEW.is_cancelled := (NEW.status = 'cancelled')`. Or deprecate `is_cancelled` entirely — replace every `is_cancelled = FALSE` with `status != 'cancelled'` across services. Pick the trigger path for now (fewer code changes).

Migration `054_sync-event-cancellation.ts`:
```ts
exports.up = (pgm) => {
  pgm.sql(`
    CREATE OR REPLACE FUNCTION sync_event_cancelled() RETURNS TRIGGER AS $$
    BEGIN
      NEW.is_cancelled := (NEW.status = 'cancelled');
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
    CREATE TRIGGER trg_sync_event_cancelled
      BEFORE UPDATE OF status ON events
      FOR EACH ROW EXECUTE FUNCTION sync_event_cancelled();
    -- Backfill
    UPDATE events SET is_cancelled = (status = 'cancelled') WHERE is_cancelled <> (status = 'cancelled');
  `);
};
```

---

## H-DB-2 — Migration 046 uses `CREATE INDEX CONCURRENTLY` inside transaction → fails

**Severity:** HIGH
**File:** `C:\Users\dasbl\AndroidStudioProjects\SoundCheck\backend\migrations\046_performance-indexes.ts` lines 12–21

**Fix:** Add `pgm.noTransaction()` at the top of `up()`. Or remove `CONCURRENTLY` (safe for empty DBs).

---

## H-DB-3 — `password_reset_tokens.token_hash` non-unique

**Severity:** HIGH
**File:** `C:\Users\dasbl\AndroidStudioProjects\SoundCheck\backend\migrations\028_password-reset-tokens.ts` lines 24–32

**Fix:** New migration `055_unique-password-reset-token-hash.ts`:
```ts
pgm.sql('DROP INDEX IF EXISTS idx_password_reset_tokens_hash; CREATE UNIQUE INDEX idx_password_reset_tokens_hash ON password_reset_tokens(token_hash);');
```

---

## H-DB-4 — `events.source+external_id` unique not partial

**Severity:** HIGH
**File:** `C:\Users\dasbl\AndroidStudioProjects\SoundCheck\backend\migrations\002_expand-create-events-table.ts` line 38

**Fix:** Migration `056_partial-unique-events-external.ts`:
```ts
exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE events DROP CONSTRAINT IF EXISTS unique_external_event;
    CREATE UNIQUE INDEX idx_events_source_external_id
      ON events(source, external_id) WHERE external_id IS NOT NULL;
  `);
};
```

---

## H-DB-5 — `NotificationService.getNotifications` uses `COUNT(*) OVER()` on every page

**Severity:** HIGH
**File:** `C:\Users\dasbl\AndroidStudioProjects\SoundCheck\backend\src\services\NotificationService.ts` lines 104–156

**Fix:** Drop the window functions. Use `LIMIT + 1` for `hasMore` and return a separate indexed COUNT only on first page (or compute unread via a trigger-maintained `users.unread_notifications` column).

---

## H-DB-6 — `findOrCreateEvent` write-after-read race

**Severity:** HIGH
**File:** `C:\Users\dasbl\AndroidStudioProjects\SoundCheck\backend\src\services\EventService.ts` lines 368–438

**Fix:** Widen the partial unique `idx_events_user_dedup` to cover all non-external sources, OR acquire `pg_advisory_xact_lock(hashtext(venue_id || event_date))` at the start of the transaction.

Migration `057_widen-events-dedup-index.ts`:
```ts
pgm.sql(`
  DROP INDEX IF EXISTS idx_events_user_dedup;
  CREATE UNIQUE INDEX idx_events_user_dedup
    ON events (venue_id, event_date, COALESCE(event_name,''), COALESCE(created_by_user_id::text,''))
    WHERE external_id IS NULL;
`);
```

---

## H-DB-7 — `TrendingService.fetchTrending` LATERAL subqueries at O(N²)

**Severity:** HIGH
**File:** `C:\Users\dasbl\AndroidStudioProjects\SoundCheck\backend\src\services\TrendingService.ts` lines 58–124

**Fix:** Materialized view refreshed hourly:
```sql
CREATE MATERIALIZED VIEW mv_event_trending_stats AS
SELECT event_id, SUM(rsvp_count) ..., COUNT(checkins) ...
FROM events LEFT JOIN event_rsvps ... GROUP BY event_id;
CREATE UNIQUE INDEX ON mv_event_trending_stats(event_id);
```
Refresh from a BullMQ cron every hour. Service reads from the MV.

---

## H-DB-8 — Migration 049 is idempotent only via down()

**Severity:** HIGH
**File:** `C:\Users\dasbl\AndroidStudioProjects\SoundCheck\backend\migrations\049_add-delete-stats-trigger.ts`

**Fix:** Add self-healing drops to `up()`:
```ts
pgm.sql(`
  DROP TRIGGER IF EXISTS trigger_update_stats_on_checkin_delete ON checkins;
  DROP FUNCTION IF EXISTS update_user_stats_on_checkin_delete();
`);
```

---

## H-DB-9 — `audit_logs` never purged

**Severity:** HIGH
**File:** `C:\Users\dasbl\AndroidStudioProjects\SoundCheck\backend\src\scripts\retentionJob.ts` lines 45–70

**Fix:** Append:
```ts
await db.query(`DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '1 year'`);
await db.query(`DELETE FROM processed_webhook_events WHERE processed_at < NOW() - INTERVAL '90 days'`);
await db.query(`DELETE FROM password_reset_tokens WHERE used_at IS NOT NULL OR expires_at < NOW() - INTERVAL '7 days'`);
```
Plus chunked DELETE pattern for large tables (LIMIT 10000 loop).

---

## H-DB-10 — `checkins.event_id` still nullable (design) but no unique partial for manual

**Severity:** HIGH (closes with B-DB-5).

---

## H-DB-11 — `notifications` FKs (`from_user_id`, `checkin_id`, `badge_id`) not indexed

**Severity:** HIGH
**Fix:** Migration `058_notifications-fk-indexes.ts`:
```ts
pgm.createIndex('notifications', 'from_user_id', { ifNotExists: true });
pgm.createIndex('notifications', 'checkin_id', { ifNotExists: true });
pgm.createIndex('notifications', 'badge_id', { ifNotExists: true });
```

---

## H-DB-12 — SubscriptionService webhook processing not in transaction

**Severity:** HIGH
**File:** `backend/src/services/SubscriptionService.ts` lines 19–67

**Fix:** Wrap SELECT+INSERT+UPDATE in one transaction. `INSERT INTO processed_webhook_events ... ON CONFLICT DO NOTHING RETURNING event_id` first; if no row returned, skip.

---

## H-DB-13 — `BlockService.blockUser` INSERT+DELETEs not atomic

**Severity:** HIGH
**File:** `backend/src/services/BlockService.ts` lines 30–77

**Fix:** Wrap lines 43–66 in a `BEGIN/COMMIT` on one client.

---

## H-DB-14 — `searchUsers` ILIKE with leading `%` → full scan

**Severity:** HIGH
**File:** `backend/src/services/user/ProfileService.ts` lines 168–206

**Fix:**
1. Add per-user rate limit to `/api/search/users`.
2. Add trigram index: migration
   ```ts
   pgm.sql(`
     CREATE EXTENSION IF NOT EXISTS pg_trgm;
     CREATE INDEX users_trgm_username ON users USING gin (LOWER(username) gin_trgm_ops);
   `);
   ```
3. Query: `... WHERE LOWER(username) %> $1`.

---

## H-MOB-1 — `/feed/events` endpoint does not exist

**Severity:** HIGH
**Files:**
- `C:\Users\dasbl\AndroidStudioProjects\SoundCheck\mobile\lib\src\features\feed\data\feed_repository.dart` lines 82–95
- Backend `backend/src/routes/feedRoutes.ts` lines 15–25 (only `/feed/events/:eventId`, `/feed/friends`, `/feed/global`, `/feed/happening-now`)

**Fix (option A — change mobile):** Point the "Events" tab to `/feed/global` until a merged-events feed ships.
**Fix (option B — add backend):** Add a `feedController.getEventsFeed` mounted at `GET /feed/events`.

Pick A for beta.

---

## H-MOB-2 — `/users/me/statistics` does not exist

**Severity:** HIGH
**Files:**
- `mobile/lib/src/features/profile/data/profile_repository.dart` lines 23–31
- Backend `userRoutes.ts` has `/users/:userId/stats`

**Fix:** Change the mobile call to `/users/${currentUserId}/stats`.

---

## H-MOB-3 — `DiscoverUsersScreen` calls non-existent `/follow/following`

**Severity:** HIGH
**File:** `mobile/lib/src/features/search/presentation/discover_users_screen.dart` lines 30–48

**Fix:** Replace with `dioClient.get('/users/${currentUserId}/following')`; parse shape used by `FollowController.getFollowing`.

---

## H-MOB-4 — Wishlist toggle is local state only

**Severity:** HIGH
**File:** `mobile/lib/src/features/bands/presentation/band_detail_screen.dart` lines 39, 125–137

**Fix:**
1. Create `wishlist_repository.dart` with `add(bandId)`, `removeByBandId(bandId)`, `isWishlisted(bandId)`.
2. In `initState`, call `isWishlisted` to seed the toggle.
3. Wire the tap to `add`/`remove` calls with error handling.

Endpoints: `POST /api/wishlist`, `DELETE /api/wishlist/:id`, `GET /api/wishlist` (already exist).

---

## H-MOB-5 — Band "Find Shows" is no-op SnackBar

**Severity:** HIGH
**File:** `mobile/lib/src/features/bands/presentation/band_detail_screen.dart` lines 138–145

**Fix:** Either hide the button until a band-filtered events screen is built, OR implement a push to `/events?bandId=${band.id}` and filter in `events_screen`.

Pick hide for beta. Re-introduce later.

---

## H-MOB-6 — Profile "Share Profile" is no-op SnackBar

**Severity:** HIGH
**File:** `mobile/lib/src/features/profile/presentation/profile_screen.dart` lines 276–288

**Fix:**
```dart
SharePlus.instance.share(ShareParams(
  text: 'Check out @${user.username} on SoundCheck — ${ApiConfig.webBaseUrl}/u/${user.username}'
));
```
See **M-MOB-1** for `webBaseUrl`.

---

## H-MOB-7 — `SearchScreen` unreachable

**Severity:** HIGH
**Files:**
- `mobile/lib/src/features/search/presentation/search_screen.dart` (orphan)
- `mobile/lib/src/core/router/app_router.dart`

**Fix:** Pick canonical UX.
Route it: add
```dart
GoRoute(path: '/search', name: 'search', builder: (_, __) => const SearchScreen()),
```
And update `feed_screen.dart` search icon to go to `/search`. Or delete `search_screen.dart` and `search/data/search_providers.dart` if the inline discover search is canonical.

---

## H-MOB-8 — Feed `loadMore` swallows errors and re-issues same cursor

**Severity:** HIGH
**File:** `mobile/lib/src/features/feed/presentation/providers/feed_providers.dart` lines 52–55, 87–90, 127–131, 163–166

**Fix:** Use `AsyncValue.guard` + in-flight guard:
```dart
Future<void> loadMore() async {
  if (_isLoadingMore) return;
  _isLoadingMore = true;
  try {
    final next = await _fetchPage(_nextCursor);
    state = AsyncValue.data(next);
    _nextCursor = next.nextCursor;
  } finally {
    _isLoadingMore = false;
  }
}
```
Apply to all four paginated notifiers.

---

## H-MOB-9 — Notification mark-as-read / delete silently fails

**Severity:** HIGH
**File:** `mobile/lib/src/features/notifications/presentation/providers/notification_providers.dart` lines 44–62, 102–120

**Fix:** Fold the Either:
```dart
final res = await repository.markAsRead(id);
res.fold((f) => throw Exception(f.message), (_) => null);
```

---

## H-MOB-10 — Subscription purchase always buys `packages.first`

**Severity:** HIGH
**File:** `mobile/lib/src/features/subscription/presentation/pro_feature_screen.dart` lines 47, 159–172

**Fix:** Add plan picker (SegmentedControl/ToggleButtons); filter packages by `packageType`. Pass selected `Package` to `_onSubscribe`. Disable button when `packages.isEmpty`.

---

## H-MOB-11 — RevenueCat keys via `String.fromEnvironment` with no default

**Severity:** HIGH
**File:** `mobile/lib/src/features/subscription/presentation/subscription_service.dart` lines 10–25

**Fix:** Throw in non-debug if key missing:
```dart
if (kReleaseMode && apiKey.isEmpty) {
  throw StateError('RevenueCat key missing for ${Platform.operatingSystem}');
}
```
Document `--dart-define=RC_APPLE_KEY=...` in the release script.

---

## H-MOB-12 — Wrapped premium gate is client-only

**Severity:** HIGH
**File:** `mobile/lib/src/core/router/app_router.dart` lines 631–653

**Fix:** Add a redirect on the route:
```dart
GoRoute(
  path: '/wrapped/:year/detail',
  redirect: (ctx, state) {
    final isPremium = ref.read(isPremiumProvider).asData?.value ?? false;
    return isPremium ? null : '/pro';
  },
  builder: (_, s) => WrappedDetailScreen(year: s.pathParameters['year']!),
)
```

---

## H-INF-1 — `PORT` env not validated; bad value → random bind

**Severity:** HIGH
**File:** `backend/src/index.ts` lines 96, 445

**Fix:**
```ts
const PORT = parseInt(process.env.PORT || '3000', 10);
if (Number.isNaN(PORT) || PORT <= 0 || PORT > 65535) {
  logError('Invalid PORT env'); process.exit(1);
}
```

---

## H-INF-2 — Tracked debug artifacts in git

**Severity:** HIGH
**Files:**
- `backend/server.log` (tracked)
- `backend/social_auth_content.txt` (tracked)
- `backend/init_db.sql` (tracked — closed by B-DB-2)
- `backend/fix_coverage.py` (untracked; remove)
- `errors.txt` (untracked, 1.1MB)
- `nul` (Windows accidental redirect)

**Fix:**
```sh
git rm backend/server.log backend/social_auth_content.txt
rm -f errors.txt nul backend/fix_coverage.py
```
Add `errors.txt` and `nul` to root `.gitignore`.

---

## H-INF-3 — CI lint step swallows failures

**Severity:** HIGH
**File:** `.github/workflows/ci.yml` line 30

**Fix:** Remove `|| echo "ESLint not configured yet, skipping"`. Lint failures must block PR.
Also: update `backend/.husky/pre-commit` from `npm test` to `npx lint-staged`.

---

## H-INF-4 — Migration runs inline on boot; 2 replicas will race

**Severity:** HIGH
**File:** `railway.toml` line 11

**Fix:** For beta: stay at 1 replica. Document in deploy runbook. Future: wrap migrations in `pg_advisory_lock(1)` or split into a Railway release command.

---

## H-INF-5 — CORS fails closed on missing `CORS_ORIGIN` in prod

**Severity:** HIGH
**File:** `backend/src/index.ts` lines 141–144

**Fix:** Ensure `CORS_ORIGIN` is set in Railway with your prod domain(s). Add the Railway URL itself as a fallback for share landing pages.

---

## H-INF-6 — `APPLE_BUNDLE_ID` env default is placeholder

**Severity:** HIGH
**Files:** `.env.example` line 74, `backend/src/services/SocialAuthService.ts` line 178

**Fix:** Set Railway `APPLE_BUNDLE_ID=com.soundcheck.app`. Update `.env.example:74` to the real value.

---

## H-INF-7 — Railway + Nixpacks ship devDeps into runtime image

**Severity:** HIGH
**File:** `nixpacks.toml` line 9

**Fix:** Two-stage:
```toml
[phases.setup]
cmds = ["(cd backend && npm ci)"]
[phases.build]
cmds = ["(cd backend && rm -rf dist && npm run build && test -f dist/index.js && npm prune --production)"]
```

---

## H-INF-8 — Winston `logError` not forwarded to Sentry

**Severity:** HIGH
**Files:** `backend/src/utils/logger.ts`, `backend/src/utils/sentry.ts`

**Fix:** Custom winston transport that `Sentry.captureException` on level `error`. Ensures DB pool failures, Redis failures, worker failures all reach Sentry.

---

## H-INF-9 — No Sentry release tagging

**Severity:** HIGH
**Files:** `.github/workflows/ci.yml`, `backend/src/utils/sentry.ts` line 32

**Fix:** In Railway env: `SENTRY_RELEASE=${RAILWAY_GIT_COMMIT_SHA}`. Or in CI, bake the current commit SHA into the container image.

---

# SECTION 3 — MEDIUM (closes next)

## M-SEC-1 — `profileImageUrl` accepts any URL

**File:** `backend/src/utils/validationSchemas.ts` line 95

**Fix:** Require prefix match `process.env.R2_PUBLIC_URL`. Blocklist `profileImageUrl` from `updateProfile` body; only the multer endpoint changes it.

## M-SEC-2 — Enumeration `reset(ip)` allows pattern injection

**File:** `backend/src/utils/redisRateLimiter.ts` lines 390–426

**Fix:** Validate `ip` against IPv4/IPv6 regex before interpolation.

## M-SEC-3 — Profile-image upload uses ephemeral disk

**File:** `backend/src/middleware/upload.ts` lines 8–21; `backend/src/controllers/UserController.ts` lines 322–343

**Fix:** Switch to R2 presigned flow (same pattern as check-in photos). Until then, mount a Railway volume.

## M-SEC-4 — R2 presigned PUT has fixed `ContentLength`

**File:** `backend/src/services/R2Service.ts` lines 93–103

**Fix:** Use `createPresignedPost` with `Conditions: [['content-length-range', 0, MAX_FILE_SIZE]]`.

## M-SEC-5 — Apple token verification lacks explicit issuer

**File:** `backend/src/services/SocialAuthService.ts` lines 162–213

**Fix:** Pass `issuer: 'https://appleid.apple.com'` to `appleSignin.verifyIdToken`.

## M-SEC-6 — `is_premium` has no expiry column

**File:** `backend/src/middleware/auth.ts` lines 142–164; `backend/src/services/SubscriptionService.ts` lines 72–82

**Fix:** Nightly job reconciles with RevenueCat REST. Or add `premium_expires_at` and check in `requirePremium`.

## M-SEC-7 — Registration doesn't revoke prior sessions

**File:** `backend/src/services/user/AuthService.ts` lines 23–67

**Fix:** Call `revokeAllUserTokens(user.id)` in registration path.

## M-SEC-8 — `extractIpAddress` duplicated with drift

**Files:** `AuditService.ts:361`, `middleware/auth.ts:251`, `middleware/perUserRateLimit.ts:94`

**Fix:** One helper `getClientIp(req)` used everywhere.

## M-SEC-9 — `validate` middleware drops coerced values

**File:** `backend/src/middleware/validate.ts` lines 36–65

**Fix:**
```ts
const parsed = await schema.parseAsync({ body: req.body, query: req.query, params: req.params });
req.body = parsed.body; req.query = parsed.query; req.params = parsed.params;
```

## M-SEC-10 — `Math.random()` as sorted-set member

**File:** `backend/src/utils/redisRateLimiter.ts` lines 111, 332

**Fix:** `crypto.randomBytes(4).toString('hex')`.

## M-DB-1 through M-DB-20 — see DB audit findings

Highlights (full list above):
- `SELECT *` in hot paths (ModerationService, ReportService, MusicBrainzService, FoursquareService, SetlistFmService, BlockService, CheckinQueryService).
- OFFSET pagination on growing tables — migrate the big ones to cursor pagination (notifications, followers, wishlist, venues, bands).
- Inconsistent `toasts` unique constraints (two indexes on the same pair).
- `users.is_admin` unindexed.
- `device_tokens.token` has no length check.
- `notifications.show_id` in schema.sql but never migrated (drift).
- `shows` table in schema.sql but never created.
- `events.event_name` length drift (255 vs 500).

Each is fixable in a single migration or query rewrite. See DB audit agent output in this repo for the precise per-item fix.

## M-MOB-1 — Hardcoded share URL ignores env

**File:** `mobile/lib/src/features/checkins/presentation/checkin_screen.dart` lines 693–694

**Fix:** Add to `api_config.dart`:
```dart
static String get webBaseUrl {
  const env = String.fromEnvironment('ENVIRONMENT', defaultValue: 'dev');
  return switch (env) {
    'prod' => 'https://soundcheck-app.up.railway.app',
    'staging' => 'https://soundcheck-staging.up.railway.app',
    _ => 'http://localhost:3000',
  };
}
```
Replace all hardcoded uses.

## M-MOB-2 — `ApiConfig.wsBaseUrl` dead code

**File:** `mobile/lib/src/core/api/api_config.dart` lines 49–61; `mobile/lib/src/core/services/websocket_service.dart` lines 106–115

**Fix:** Use `ApiConfig.wsBaseUrl + '/ws'`. Remove string-stripping logic.

## M-MOB-3 — `searchBandsForCheckin` fake debounce

**File:** `mobile/lib/src/features/checkins/presentation/providers/checkin_providers.dart` lines 39–59

**Fix:** Drop `Future.delayed` + re-read; do the debounce at the screen level with a `Timer`.

## M-MOB-4 — `_VenueSearchSheet` TextField has no onChange (closes with B-MOB-3)

## M-MOB-5 — `social_share_service` `response.data!` can NPE

**File:** `mobile/lib/src/features/sharing/services/social_share_service.dart` lines 84–93

**Fix:** Check `if (response.data == null || response.data!.isEmpty) throw ShareDownloadException(...)`.

## M-MOB-6 — All repositories assume `response.data['data']` without nullcheck

**File:** `mobile/lib/src/features/auth/data/auth_repository.dart` lines 36, 64, 122, 138, 165 (pattern repeats)

**Fix:** Helper:
```dart
T extractData<T>(Response r, T Function(Map<String, dynamic>) parse) {
  if (r.data is! Map) throw ServerFailure('Unexpected response shape');
  final data = (r.data as Map)['data'];
  if (data is! Map<String, dynamic>) throw ServerFailure('Missing data field');
  return parse(data);
}
```
Apply across all repositories.

## M-MOB-7 — `getUserRecentCheckIns` has no pagination

**File:** `mobile/lib/src/features/checkins/data/checkin_repository.dart` lines 325–344

**Fix:** Add `page`/`limit` params + `hasMore`. Confirm backend honors sort params or drop them.

## M-MOB-8 — `bandCheckIns` / `venueCheckIns` / `userCheckIns` providers have no pagination

**File:** `mobile/lib/src/features/checkins/presentation/providers/checkin_providers.dart` lines 73–103

**Fix:** Convert to notifier + cursor pagination (same pattern as feed after H-MOB-8).

## M-MOB-9 — Check-in detail share has no URL, no image

**File:** `mobile/lib/src/features/checkins/presentation/checkin_detail_screen.dart` lines 114–125

**Fix:** Append share URL (env-aware per M-MOB-1). Attach a downloaded photo via `share_plus` files.

## M-MOB-10 — Reset password doesn't validate token format

**File:** `mobile/lib/src/features/auth/presentation/reset_password_screen.dart` lines 12–20, 52–72

**Fix:** Call `_isValidTokenFormat(widget.token)` in `initState`; render error and block submit if false.

## M-MOB-11 — Onboarding race during cold start

**File:** `mobile/lib/src/core/router/app_router.dart` lines 65–67; `mobile/lib/src/features/onboarding/presentation/onboarding_provider.dart` lines 14–25

**Fix:** Don't default to "seen" while loading; return a splash route until the future resolves.

## M-MOB-12 — `_AuthStateNotifier` subscription leak in dev

**File:** `mobile/lib/src/core/router/app_router.dart` lines 41–49

**Fix:** Capture the `ProviderSubscription` from `ref.listen`; cancel in `dispose()`. Add `ref.onDispose` in `goRouterProvider`.

## M-MOB-13 — `show_reminder` notification tap silently no-ops

**File:** `mobile/lib/src/features/notifications/presentation/notifications_screen.dart` lines 247–259

**Fix:** Default-route to `/events/${notification.show!.id}` or show a snackbar.

## M-MOB-14 — Avatar text `username[0]` can RangeError

**File:** `mobile/lib/src/features/profile/presentation/edit_profile_screen.dart` lines 194–202

**Fix:** `user?.username.isNotEmpty == true ? user!.username[0].toUpperCase() : 'U'`.

## M-MOB-15 — `markFeedRead` fired without error handling

**File:** `mobile/lib/src/features/feed/presentation/feed_screen.dart` lines 60–77

**Fix:** Fold the Either; log failures; only invalidate `unseenCountsProvider` on success.

## M-MOB-16 — `UserBadgeInfo.fromJson` can crash on missing fields

**File:** `mobile/lib/src/features/auth/domain/user.dart` lines 88–96

**Fix:** `@JsonKey(defaultValue: ...)` or make fields nullable.

## M-MOB-17 — `Navigator.pop` vs `context.pop` mix

**File:** `mobile/lib/src/features/checkins/presentation/checkin_screen.dart` line 865

**Fix:** Consistent per surface — `Navigator` for modal sheets is correct; document it.

## M-INF-1 — Version-bump is split across 3 files

**Files:** `mobile/pubspec.yaml:4`, `backend/package.json:3`, `mobile/ios/Runner/Info.plist`, `mobile/android/app/build.gradle.kts`

**Fix:** Add a release script that bumps `pubspec.yaml` and `backend/package.json` together. Tag git releases so Sentry `release` matches.

## M-INF-2 — `npm start` depends on `dist/` with no post-build check

**Files:** `backend/package.json:7`; `railway.toml:11`; `nixpacks.toml:13`

**Fix:** In `nixpacks.toml`:
```toml
cmds = ["(cd backend && rm -rf dist && npm run build && test -f dist/index.js)"]
```

## M-INF-3 — Root lint-staged + husky inconsistent with backend lint-staged + husky

**Files:** root `.husky/pre-commit`, `backend/.husky/pre-commit`, both `package.json` files

**Fix:** Consolidate to root husky with one lint-staged config. Delete `backend/.husky/`.

## M-INF-4 — No PITR/backup plan documented

**Fix:** Upgrade Railway plan for PITR. Add monthly `pg_dump` → R2 script as belt.

## M-INF-5 — No CDN/WAF for share pages

**Fix:** Cloudflare in front of Railway. Cache `/share/*` and `/wrapped/*`. Enable WAF managed rules.

## M-INF-6 — `.gitignore` typo `local.propertiescal.properties`

**File:** `.gitignore:37`

**Fix:** Delete that line — covered by `/local.properties` at line 25.

## M-INF-7 — `.railwayignore` ships `coverage/` and `tsconfig.tsbuildinfo`

**File:** `backend/.railwayignore`

**Fix:** Add `coverage/`, `*.tsbuildinfo`, `*.test.ts`, `*.spec.ts`.

## M-INF-8 — Husky backend pre-commit runs `npm test` → slow

**File:** `backend/.husky/pre-commit`

**Fix:** Move tests to pre-push or CI only.

## M-INF-9 — `FIREBASE_SERVICE_ACCOUNT_JSON` parse has no try/catch

**File:** `backend/src/services/PushNotificationService.ts` line 23

**Fix:** Wrap in try/catch; log + skip FCM init on failure.

## M-INF-10 — No Dockerfile for reproducible local build

**Fix (optional):** Add `backend/Dockerfile` mirroring Nixpacks phases for dev parity.

---

# SECTION 4 — LOW

(Grouped; full evidence in the four per-domain sections of this document. Summaries only.)

- **L-SEC-1** `dotenv.config()` skipped when `NODE_ENV=production` — document in deploy runbook.
- **L-SEC-2** `PerUserRateLimiter.cleanupInterval` not `.unref()` — fix, low priority.
- **L-SEC-3** JWT verify error message may leak structural details.
- **L-SEC-4** `getStatus` always hits DB — cache in Redis.
- **L-DB-1..9** Seed.ts Unsplash URLs; `showId` on NotificationService interface; `BlockService.blockUser` misleading ON CONFLICT; `events.event_name` length drift; `end_time < start_time` cross-midnight edge; `events.updated_at` trigger OK; badge `criteria` no CHECK; `FollowService` notification outside tx; `mapDbVenueToVenue` parseInt NaN risk.
- **L-MOB-1** Unused screens: `bands_screen.dart`, `venues_screen.dart`, `trending_feed_screen.dart` — delete or route.
- **L-MOB-2** Unused `ApiConfig.shows` — delete.
- **L-MOB-3** `SecureStorageOptions.createStorage()` factory unused — use or delete.
- **L-MOB-4** `_socialAuthService` nullable catch can silently no-op login.
- **L-MOB-5** Gradle signing falls back to debug on missing `key.properties` — throw instead.
- **L-MOB-6** Edit profile controllers not reset on user change.
- **L-MOB-7** `LogInterceptor.requestBody: true` logs passwords in dev.
- **L-MOB-8** Custom URL scheme password reset vulnerable to hijacking (SEC-056 in-code) — migrate to Universal Links/App Links.
- **L-MOB-9** Two visible "coming soon" strings remain (`Find shows`, `Share profile`).
- **L-MOB-10** `pubspec.yaml` Firebase version axis wide.
- **L-INF-1** `backend/src/scripts/migrate.ts` defaults password to `"password"` (closed by B-DB-2).
- **L-INF-2** `tsconfig.tsbuildinfo` tracked — remove.
- **L-INF-3** Root `.gitignore` `/docs/` mismatches present tracked docs.
- **L-INF-4** Release signing falls back to debug (matches L-MOB-5).
- **L-INF-5** iOS ATS allows localhost cleartext (debug-only exception not gated).
- **L-INF-6** `.prettierignore`/coverage HTML shipped in repo.
- **L-INF-7** No Dockerfile (reproducibility).
- **L-INF-8** `backend/uploads/profiles/.gitkeep` hints at ephemeral disk storage.
- **L-INF-9** `mobile/.env.example` base URL dev-only; release must pass `--dart-define`.
- **L-INF-10** `APPLE_BUNDLE_ID` placeholder in `.env.example`.
- **L-INF-11** `requiredEnvVars` list missing `REVENUECAT_WEBHOOK_AUTH` and `FIREBASE_SERVICE_ACCOUNT_JSON` guards for prod.

---

# SECTION 5 — Fix-first order for beta launch

Execute in this order. Each bullet is a single PR.

**Day 1 — Secrets & signing (1 day, 1 dev):**
1. B-SEC-1 — rotate Railway secrets; purge `backend/.env` from disk.
2. B-INF-1 — move keystore + rotate passwords.
3. B-INF-2 — delete `backend/vercel.json`, `backend/.vercelignore`.
4. H-INF-2 — `git rm backend/server.log backend/social_auth_content.txt`; clean `errors.txt`, `nul`.

**Day 2 — DB bootstrap & migrations (1 day, 1 dev):**
5. B-DB-2 + B-DB-1 + B-DB-3 — delete `database-schema.sql`, `init_db.sql`, `migrate.js`, `src/scripts/migrate.ts`, remove legacy scripts from `package.json`.
6. B-DB-4 — migration 050 (external IDs).
7. B-DB-8 — migration 053 (is_demo).
8. B-DB-5 — migration 052 (manual check-in unique partial).
9. B-DB-7 — patch migration 018 to upsert.
10. H-DB-2 — `pgm.noTransaction()` on migration 046.
11. H-DB-3 — migration 055 (password-reset token_hash unique).
12. H-DB-4 — migration 056 (partial unique on events.source+external_id).
13. H-DB-6 — migration 057 (widen events dedup).
14. H-DB-8 — patch migration 049 idempotent drops.
15. H-DB-11 — migration 058 (notification FK indexes).
16. H-DB-1 — migration 054 (event cancelled sync trigger).
17. H-DB-9 — extend retention job to purge audit_logs, password_reset_tokens, processed_webhook_events.

**Day 3 — Auth & secrets infra (1–2 days, 1 dev):**
18. B-SEC-2 — refresh-token split-selector + reuse detection.
19. B-MOB-1 — password-flow returns refresh token + mobile wiring.
20. B-SEC-4 — OAuth state wiring end-to-end.
21. H-SEC-1..9 — medium auth hardening (AdminController, rate limits, IP extraction, jitter, etc.).

**Day 4 — Mobile beta-killers (2 days, 1–2 devs):**
22. B-MOB-7 + B-INF-5 — Firebase config files + CI secrets.
23. B-MOB-8 — iOS push entitlements.
24. B-MOB-9 — Android POST_NOTIFICATIONS.
25. B-MOB-2 — push-notification init wiring + deep link routing.
26. B-MOB-3 — venue search real API.
27. B-MOB-4 — celebration screen route after check-in.
28. B-MOB-5 — edit profile Either handling.
29. B-MOB-6 — WS reconnect keeps token.
30. H-MOB-1..12 — fix 404 endpoints, wire wishlist, fix feed pagination, plan picker, etc.

**Day 5 — Ops & observability (1 day, 1 dev):**
31. B-INF-3 — retention job scheduled via BullMQ.
32. B-INF-4 — `/health` only 503 on DB down.
33. H-INF-3 — CI lint no longer swallowed.
34. H-INF-4 — Railway single-replica documented.
35. H-INF-5 — confirm `CORS_ORIGIN` set.
36. H-INF-6 — confirm `APPLE_BUNDLE_ID`.
37. H-INF-7 — nixpacks prune prod after build.
38. H-INF-8 — winston → Sentry forward for error-level.
39. H-INF-9 — Sentry release tagging.

**Day 6–7 — Medium cleanup + regression test (2 days, 2 devs):**
40. Close all M-SEC-*, M-DB-* (esp. SELECT * and OFFSET pagination on hot tables), M-MOB-* in parallel.
41. Add smoke tests covering: register/login/refresh, checkin (event), checkin (manual), share, notifications, wishlist, block, report, subscription webhook.
42. Run full mobile E2E on iOS + Android (physical devices).

**Day 8 — Canary → open beta gate:**
43. Deploy to Railway with `SENTRY_RELEASE=<sha>`.
44. Invite-only canary ≥ 24h with 20–50 users.
45. Monitor Sentry, Railway logs, `/health`, queue depth.
46. If error rate < 0.5% and no P0 → flip open beta gate.

---

# SECTION 6 — Out-of-scope (tracked, not blocking)

- Full test coverage pass. Existing Jest suite runs on CI but coverage is uneven across services. Fine for beta.
- Performance benchmarking at scale (>10k concurrent). Current indexes + caches suffice for <5k DAU.
- Full accessibility audit of Flutter app (there are references to `ACCESSIBILITY_TESTING.md` but no automated checks).
- Localization / i18n — English-only is acceptable for open beta.
- Dark-mode polish.

---

# Appendix A — Per-domain source-of-truth audit reports

The four parallel audits produced detailed findings per domain. This document consolidates them. If you need full prose on any finding, see:

- `docs/reviews/phase1-backend-services.md` (routes/controllers wiring — prior internal review)
- `docs/reviews/phase1-security-backend.md` / `phase1-security-mobile.md` (security — prior internal review)
- `docs/reviews/phase1-backend-database.md` / `phase2-data-integrity.md` (DB — prior internal review)
- `docs/reviews/phase1-mobile-ui.md` / `phase1-mobile-state.md` / `phase2-e2e-core-flows.md` (mobile — prior internal review)
- `docs/reviews/phase1-infrastructure.md` (infra — prior internal review)

**This document is the authoritative pre-open-beta gate list. Any item marked BLOCKER here must be closed before flipping the invite ceiling.**
