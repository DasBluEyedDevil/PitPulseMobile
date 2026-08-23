# Testing

## Backend

Run from `backend/`:

```bash
npm run lint
npm run typecheck
npm test
```

`npm test` requires `JWT_SECRET` of at least 32 characters (`AuthUtils` reads it at import time). `backend/src/__tests__/setup.ts` sets a non-production stub when the variable is unset so local `npm test` works without exporting it (A-022). The stub is never applied when `NODE_ENV=production`. CI still sets `JWT_SECRET` explicitly on coverage and integration jobs.

CI also runs `npm run build`, which writes `backend/dist/`. Do not treat `dist/` changes as source edits.

Phase 30 backend release gates:

```bash
npm run test:dependency-compatibility
npm run test:runtime-assets
npm run test:startup:unhealthy
npm audit --omit=dev
```

The migration recovery matrix requires a disposable local PostgreSQL database
whose name contains `phase30`; it drops and recreates that database's `public`
schema:

```bash
PHASE30_DATABASE_URL=postgresql://soundcheck:soundcheck@localhost:5432/soundcheck_phase30 \
  npm run test:migrations:integration
```

The Jest suite should pass without `--forceExit`. If Jest reports open handles, fix the lifecycle leak in the code or test setup instead of masking it.

Open-beta contract and coverage gates:

```bash
npm run test:http-contracts
node ../scripts/verify-async-contracts.mjs
JWT_SECRET=ci-test-secret-must-be-at-least-32-characters-long npm run test:coverage
```

A-021: the CI **coverage** job (`npm run test:coverage` in `backend-lint-and-test`) is unit-only and does not set `RUN_INTEGRATION_TESTS`. The **integration** job runs against disposable Postgres/Redis with `RUN_INTEGRATION_TESTS=true` and includes `CheckinService.integration.test.ts`. Do not point the coverage job at Postgres. Coverage percentage is not proof of event-delete RESTRICT, check-in window, daily 10/day, or premium HTTP 403 — those are the EventService deleteEvent suite (PR 1), window tests (PR 4), `checkinRateLimit.test.ts`, and mounted `wrappedRoutes` tests.

The HTTP contract gate parses the TypeScript route AST, verifies every router
mount and endpoint signature against
`docs/contracts/http-route-contract.json`, and resolves auth, validation,
request-model, response-model, status-source, and effect-owner evidence for
each active row. Update the versioned contract deliberately when adding,
removing, moving, or reclassifying a route.

The async contract gate validates the producer, consumer, and executable-test
evidence recorded in `docs/contracts/async-contracts.json`. It also compares
the backend and Dart WebSocket event values and fails when a backend event has
no mobile consumer. Queue producers and workers share the typed names in
`backend/src/jobs/queueContracts.ts`; never duplicate those runtime strings.

Backend coverage is collected from the existing full `src/**/*.ts` inventory
(except declarations and the process entrypoint) and fails below 60% lines and
statements or 50% branches and functions. Do not weaken the thresholds or add
coverage exclusions to make the gate green.

Targeted backend checks for the current realtime/contract hardening work:

```bash
npm test -- --runTestsByPath src/__tests__/utils/websocket.test.ts
npm test -- --runTestsByPath src/__tests__/services/RealtimePublisher.test.ts
npm test -- --runTestsByPath src/__tests__/services/PushNotificationService.test.ts src/__tests__/jobs/notificationWorker.test.ts src/__tests__/services/NotificationBatchService.test.ts
npm test -- --runTestsByPath src/__tests__/middleware/validate.test.ts src/__tests__/integration/errorContract.test.ts src/__tests__/config/cors.test.ts
npm test -- --runTestsByPath src/__tests__/services/TicketmasterAdapter.test.ts
npm test -- --runTestsByPath src/__tests__/utils/cache.test.ts src/__tests__/services/FeedService.cache.test.ts src/__tests__/services/CheckinCreatorService.cache.test.ts src/__tests__/middleware/perUserRateLimit.test.ts
npm test -- --runTestsByPath src/__tests__/services/R2Service.test.ts src/__tests__/services/CheckinPhotoService.test.ts
npm test -- --runTestsByPath src/__tests__/jobs/asyncWorkers.test.ts src/__tests__/controllers/SubscriptionController.contract.test.ts
npm test -- --runTestsByPath src/__tests__/middleware/checkinRateLimit.test.ts src/__tests__/routes/wrappedRoutes.test.ts src/__tests__/controllers/WishlistWrappedControllers.contract.test.ts
```

These targeted suites cover WebSocket JWT query auth, authenticated acknowledgements, room validation (`user:` isolation must not regress), Redis realtime Pub/Sub envelopes, push token ownership/batching, canonical error envelopes, CORS PATCH preflight, Ticketmaster recursion/rate limiting, versioned cache invalidation, SCAN/UNLINK rate-limit reset, and R2 photo confirmation. The async worker/controller suites additionally cover retry propagation, moderation side effects, queue payload routing, and RevenueCat webhook authentication, malformed envelopes, mapping, idempotency, and failures. Daily check-in cap (9 next / 10 → 429 / DB throw fail-closed / missing user 401) and Wrapped `requirePremium` HTTP 403 are locked by the dedicated limiter and mounted-router tests.

## Mobile

Run from `mobile/`:

```bash
flutter pub get
flutter pub run build_runner build --delete-conflicting-outputs
flutter analyze
flutter test
```

Analyzer warnings are treated as work to fix. Generated Dart outputs are excluded from linting; regenerate them when model annotations change.

Open-beta mobile coverage gate:

```bash
flutter test --coverage
node ../scripts/check-mobile-coverage.mjs
```

The mapping in `scripts/mobile-coverage-contract.json` requires 40% global
line coverage and 70% for auth, check-in/photo, feed/realtime/push, account
lifecycle, sharing, and subscription groups. The validator excludes only
generated Dart and fails when a hand-written `mobile/lib` file is absent from
LCOV, so uninstrumented source cannot silently improve the percentage.

Targeted mobile checks for the same work:

```bash
flutter test test/src/core/services/websocket_service_test.dart
flutter test test/src/core/services/push_notification_service_test.dart
flutter test test/src/core/api/dio_client_test.dart
flutter test test/src/core/providers/auth_state_test.dart
flutter test test/src/features/checkins/presentation/checkin_detail_screen_test.dart
flutter test test/src/features/feed/presentation/providers/feed_providers_test.dart
```

These targeted suites cover WebSocket URI/token construction, authenticated state/reconnect cleanup, room helpers, push initialization/deep-link parsing, Dio parsing for canonical and legacy error shapes, logout cleanup, check-in room lifecycle, and active event room membership.

## Web

`PUBLIC_API_BASE_URL` is required for `astro build` (password-reset is the only web→API call). Copy `web/.env.example` or export the variable. Use the env var name only; do not commit API hosts as source fallbacks.

Run from the repo root:

```bash
npm run build:web
```

Run locally:

```bash
npm run dev:web
```

The web build runs `astro build`, syncs root legal markdown into `web/src/content/legal/`, and emits the Astro static bundle. CI's `web-build` job sets `PUBLIC_API_BASE_URL` and also asserts that `astro build` fails when it is empty.

## Agent Harness

Run from the repo root:

```bash
npm run harness:check
```

This verifies that the agent docs map is present, `AGENTS.md` remains concise, durable knowledge directories are not ignored, and generated backend build output is not tracked.
