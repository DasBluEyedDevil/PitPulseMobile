# AGENTS.md - SoundCheck Agent Map

This file is a table of contents, not the project encyclopedia. Keep it short and point agents to versioned source-of-truth docs.

## Start Here

- Agent knowledge map: `docs/agent/README.md`
- Architecture boundaries: `docs/agent/ARCHITECTURE.md`
- Code conventions: `docs/agent/CONVENTIONS.md`
- Testing and verification: `docs/agent/TESTING.md`
- Harness checks and feedback loops: `docs/agent/HARNESS.md`
- Quality/debt snapshot: `docs/agent/QUALITY.md`
- Planning workflow: `docs/agent/PLANS.md`

## Repository Shape

- `backend/`: Node.js, Express, TypeScript API deployed to Railway.
- `mobile/`: Flutter app for iOS and Android.
- `web/`: Astro static marketing/legal/support website.
- `.planning/`: existing Legion-style milestone and execution-plan history.
- `docs/`: durable, versioned knowledge for humans and agents.

## Default Workflow

1. Read this file, then `docs/agent/README.md`.
2. Read only the deeper docs relevant to the task.
3. Inspect code before changing it; do not rely on stale summaries.
4. Keep changes scoped and preserve unrelated local work.
5. Run the relevant checks before calling work done.

## Common Commands

From the repository root:

```bash
npm run harness:check
npm run build:web
npm run test --prefix backend
cd mobile && flutter test
```

Backend:

```bash
cd backend
npm install
npm run lint
npm run typecheck
npm test
npm run build
```

Mobile:

```bash
cd mobile
flutter pub get
flutter pub run build_runner build --delete-conflicting-outputs
flutter analyze
flutter test
```

## Guardrails

- Never commit `.env`, keystores, tokens, logs, or local agent worktrees.
- Do not hand-edit generated Dart files (`*.g.dart`, `*.freezed.dart`); regenerate them.
- Treat `backend/dist/` as generated build output, not source of truth.
- Use structured validation at API boundaries and keep logging sanitized.
- Prefer existing repo patterns over new frameworks or abstractions.
- For multi-file or architectural work, create or update an execution plan in `.planning/` and link durable outcomes from `docs/agent/`.

## Baseline Checks

CI is expected to cover:

- Agent harness docs check.
- Backend lint, TypeScript typecheck, build, and Jest.
- Mobile code generation, analyzer, and Flutter tests.
- Secret scanning with Gitleaks.

If a baseline fails before your change, call it out and fix it unless it is clearly outside the requested scope.
