# Architecture

## Monorepo

SoundCheck has three shipped surfaces:

- `backend/`: Express API in TypeScript, PostgreSQL for persistence, Redis/BullMQ for caching and jobs, Sentry for errors, Railway/Nixpacks for deployment.
- `mobile/`: Flutter app using Riverpod, GoRouter, Dio, Freezed/json_serializable, Firebase/Sentry, and platform secure storage.
- `web/`: Astro static website for marketing, support, privacy, and terms pages. It uses local brand assets and syncs legal markdown from the repo root into `web/src/content/legal/` before dev/build.

## Backend Boundaries

Request flow is:

1. `src/index.ts` wires process setup, middleware, routes, health checks, and shutdown.
2. `src/routes/` maps HTTP endpoints to controllers and middleware.
3. `src/controllers/` owns request/response handling and calls services.
4. `src/services/` owns business logic, database orchestration, jobs, and external providers.
5. `src/config/` owns PostgreSQL and Redis configuration.
6. `src/utils/` owns shared concerns such as auth, logging, validation, cache, websocket, and mapping helpers.
7. `src/types/` contains shared TypeScript domain and API types.

Controllers should not embed SQL or provider logic. Services should not depend on Express response objects. Cross-cutting concerns must enter through explicit utilities or middleware.

## Mobile Boundaries

Feature code lives under `mobile/lib/src/features/{feature}/`:

- `domain/`: immutable models and feature types.
- `data/`: repositories and API mapping.
- `presentation/`: screens, widgets, and Riverpod providers.

App-wide concerns live under `mobile/lib/src/core/`; reusable UI/utilities live under `mobile/lib/src/shared/`.

Generated Dart files are implementation artifacts. Update the source annotations and rerun build_runner rather than editing generated output.

## Web Boundaries

The web app is a static frontend surface. It should not own backend business logic, secrets, or support-ticket processing. Legal content remains sourced from the root markdown files and is copied by `web/scripts/sync-legal.mjs` before Astro runs.

## Integration Contracts

- Backend API failures use the canonical envelope `{ success: false, error: { code, message, details? } }`; mobile `DioClient` must continue parsing both this shape and legacy string errors during rollout.
- Backend request validation uses Zod schemas at route boundaries.
- Mobile repositories map Dio failures through `DioClient.handleDioError` or feature-specific failures.
- JWT auth is issued by the backend and stored by mobile in secure storage.
- Generated backend `dist/` output is not the source of truth; Railway builds from `backend/src`.

## Realtime Contracts

- WebSocket authentication happens during upgrade. Mobile builds the URL from `ApiConfig.wsBaseUrl` and sends the JWT as a URL-encoded `token` query parameter; the backend rejects missing/invalid JWTs before connection and sends `connected` plus `authenticated` for accepted sessions.
- The post-connect `auth` message remains compatibility-only. Logout/manual disconnect clears WebSocket credentials, desired rooms, timers, and suppresses reconnect; network disconnects may reconnect only while credentials remain active.
- Room names are prefix-scoped and UUID-validated: `checkin:<uuid>`, `event:<uuid>`, `venue:<uuid>`, and `user:<uuid>`. `user:` rooms may only match the authenticated user. `event:` rooms represent active attendance, not event-detail browsing.
- Multi-instance realtime delivery uses Redis Pub/Sub envelopes on the shared realtime channel: user-targeted envelopes carry `{ target: 'user', userId, type, payload }`; room-targeted envelopes carry `{ target: 'room', room, type, payload }`. WebSocket servers subscribe and deliver locally, with logs/health expected to surface Redis degradation.

## Push Notifications

- Mobile push initialization is idempotent: repeated `initialize()` calls reuse the in-flight future and do not register duplicate Firebase listeners. Logout calls reset session-scoped subscriptions and clears the current token while preserving app-level tap streams.
- Device tokens are single-owner backend records. Registering an existing FCM token transfers ownership to the current user; logout best-effort unregisters the current token before auth credentials are cleared.
- Push payloads use canonical internal `deepLink` route paths, with compatibility IDs such as `checkinId`, `eventId`, and entity IDs as secondary fields. Mobile only accepts internal app routes and rejects external, malformed, or unknown deep links.
- Notification batching is coordinated through the backend batch helper so Redis list append, marker ownership, delayed queue enqueue, and worker cleanup remain observable and recoverable.

## External Providers And Storage

- Feed cache invalidation is versioned. Feed cache keys include scope versions, invalidation increments versions, and old version keys expire naturally by TTL instead of broad pattern deletes.
- Ticketmaster ingestion uses recursion depth, minimum-window, and midpoint-boundary guards. All Ticketmaster request paths use the shared process-local limiter and 429 retry/backoff handling; truncated dense windows are logged for monitoring.
- Direct photo confirmation must `HEAD` pending R2 objects before writing public URLs or deleting pending rows. Missing uploads are client-retryable and leave pending rows intact; transient R2 failures should remain server-retryable.
