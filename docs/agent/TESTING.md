# Testing

## Backend

Run from `backend/`:

```bash
npm run lint
npm run typecheck
npm test
```

CI also runs `npm run build`, which writes `backend/dist/`. Do not treat `dist/` changes as source edits.

Phase 30 backend release gates:

```bash
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

Targeted backend checks for the current realtime/contract hardening work:

```bash
npm test -- --runTestsByPath src/__tests__/utils/websocket.test.ts
npm test -- --runTestsByPath src/__tests__/services/RealtimePublisher.test.ts
npm test -- --runTestsByPath src/__tests__/services/PushNotificationService.test.ts src/__tests__/jobs/notificationWorker.test.ts src/__tests__/services/NotificationBatchService.test.ts
npm test -- --runTestsByPath src/__tests__/middleware/validate.test.ts src/__tests__/integration/errorContract.test.ts src/__tests__/config/cors.test.ts
npm test -- --runTestsByPath src/__tests__/services/TicketmasterAdapter.test.ts
npm test -- --runTestsByPath src/__tests__/utils/cache.test.ts src/__tests__/services/FeedService.cache.test.ts src/__tests__/services/CheckinCreatorService.cache.test.ts src/__tests__/middleware/perUserRateLimit.test.ts
npm test -- --runTestsByPath src/__tests__/services/R2Service.test.ts src/__tests__/services/CheckinPhotoService.test.ts
```

These targeted suites cover WebSocket JWT query auth, authenticated acknowledgements, room validation, Redis realtime Pub/Sub envelopes, push token ownership/batching, canonical error envelopes, CORS PATCH preflight, Ticketmaster recursion/rate limiting, versioned cache invalidation, SCAN/UNLINK rate-limit reset, and R2 photo confirmation.

## Mobile

Run from `mobile/`:

```bash
flutter pub get
flutter pub run build_runner build --delete-conflicting-outputs
flutter analyze
flutter test
```

Analyzer warnings are treated as work to fix. Generated Dart outputs are excluded from linting; regenerate them when model annotations change.

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

Run from the repo root:

```bash
npm run build:web
```

Run locally:

```bash
npm run dev:web
```

The web build runs `astro build`, syncs root legal markdown into `web/src/content/legal/`, and emits the Astro static bundle.

## Agent Harness

Run from the repo root:

```bash
npm run harness:check
```

This verifies that the agent docs map is present, `AGENTS.md` remains concise, durable knowledge directories are not ignored, and generated backend build output is not tracked.
