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
