# Testing

## Backend

Run from `backend/`:

```bash
npm run lint
npm run typecheck
npm test
```

CI also runs `npm run build`, which writes `backend/dist/`. Do not treat `dist/` changes as source edits.

The Jest suite should pass without `--forceExit`. If Jest reports open handles, fix the lifecycle leak in the code or test setup instead of masking it.

## Mobile

Run from `mobile/`:

```bash
flutter pub get
flutter pub run build_runner build --delete-conflicting-outputs
flutter analyze
flutter test
```

Analyzer warnings are treated as work to fix. Generated Dart outputs are excluded from linting; regenerate them when model annotations change.

## Agent Harness

Run from the repo root:

```bash
npm run harness:check
```

This verifies that the agent docs map is present, `AGENTS.md` remains concise, durable knowledge directories are not ignored, and generated backend build output is not tracked.
