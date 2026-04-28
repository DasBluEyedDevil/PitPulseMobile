# Harness Alignment

This repo aligns to the harness-engineering standard in a staged way: make the repo legible first, then deepen automated feedback loops.

## Current Harness

- Short `AGENTS.md` points to focused docs instead of embedding all rules.
- `docs/agent/` is the stable knowledge base for architecture, conventions, testing, planning, quality, and harness checks.
- `.planning/` remains the active execution-plan workspace and is cross-linked rather than discarded.
- `npm run harness:check` enforces the docs map and generated-artifact policy.
- CI runs harness, backend, mobile, and secret-scan jobs.

## Feedback Loops

- Backend: ESLint, TypeScript typecheck, Jest, build, Gitleaks.
- Mobile: build_runner, analyzer, Flutter tests.
- Repo knowledge: harness check plus doc freshness rules in this directory.

## Next Harness Investments

- Add one-command local boot scripts for isolated backend/mobile validation.
- Add smoke scripts that drive the API and mobile app from a clean worktree.
- Add structural lint checks for backend layer boundaries and mobile feature-layer imports.
- Add recurring doc-gardening checks that compare docs against manifests and CI commands.
