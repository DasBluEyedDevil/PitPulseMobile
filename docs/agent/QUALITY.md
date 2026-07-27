# Quality Snapshot

## Required Green Gates

- `npm run harness:check`
- `npm run lint --prefix backend`
- `npm run typecheck --prefix backend`
- `npm test --prefix backend`
- `flutter analyze` from `mobile/`
- `flutter test` from `mobile/`

## Current Standards

- Generated output is not source of truth.
- Red analyzer/test baselines should be fixed when encountered.
- Durable agent knowledge belongs in tracked docs.
- Repeated mistakes should become docs or checks.

## Known Debt To Track

- `.planning/` contains useful history and some stale snapshots; promote only durable knowledge into `docs/agent/`.
- Local `.env` loading makes backend test output noisy; future cleanup should quiet dotenv/logger output in test mode.
- The repo has several tool-specific local directories (`.claude/`, `.gemini/`, `.kilo/`, `.serena/`); only durable, intentional config should be tracked.
- The current worktree is intentionally large and dirty across backend, mobile, tests, toolchain files, and untracked plan/test artifacts. Preserve unrelated local changes and review diffs by path before editing or committing.
- Do not hand-edit generated Dart files (`*.g.dart`, `*.freezed.dart`) or backend `dist/`; regenerate from source when annotations or build outputs change.
- Versioned feed cache invalidation leaves old cache keys until TTL expiry by design. Watch Redis memory/TTL behavior after high-fan-out check-ins rather than reintroducing broad deletes.
- Ticketmaster dense-window truncation now prevents runaway recursion but can omit events when limits are hit. Monitor truncation logs/metrics and retry targeted windows operationally when needed.
- RevenueCat webhook lag remains an operational caveat: mobile may show local purchase success before server-authoritative entitlement catches up, so premium gating must keep clear sync/retry UX.
- Redis degradation can affect cache, rate limiting, realtime Pub/Sub, queues, and notification batching differently. Health/logging should identify which feature is degraded instead of treating Redis as one opaque dependency.
- Open-beta backend and Android/iOS mobile coverage clear their versioned thresholds. Mobile enforcement remains fail-closed at 40% global and 70% for every critical journey group, and it rejects executable hand-written source missing from LCOV. Do not lower targets, exclude hand-written source, or treat local coverage as signed-device or staging evidence.
