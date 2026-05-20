# Agent Knowledge Map

SoundCheck follows the OpenAI harness-engineering pattern: agents start from a short map, then progressively open deeper repository-local docs. Knowledge that matters for implementation should live in this repo, be versioned, and be mechanically checkable.

## Source Of Truth

- `AGENTS.md` is the short entry point injected into agent context.
- `docs/agent/` is the durable agent knowledge base.
- `.planning/` remains the active milestone and execution-plan workspace for the existing Legion workflow.
- Code, tests, schemas, CI, and scripts override stale prose.

## Read By Task

- System shape and dependency boundaries: `docs/agent/ARCHITECTURE.md`
- Style, validation, logging, generated-code policy: `docs/agent/CONVENTIONS.md`
- Verification commands and known test requirements: `docs/agent/TESTING.md`
- Local/CI feedback loops and harness rules: `docs/agent/HARNESS.md`
- Current quality gates and debt: `docs/agent/QUALITY.md`
- Planning artifacts and update rules: `docs/agent/PLANS.md`
- Mobile beta/store automation: `docs/STORE_SUBMISSION_FASTLANE.md`
- RevenueCat subscriptions and paywall: `docs/REVENUECAT_FLUTTER.md`

## Maintenance Rules

- Keep `AGENTS.md` concise; add detail here or in a focused doc instead.
- Update this index whenever adding or renaming durable agent docs.
- Promote repeated review feedback into docs or checks.
- Prefer mechanical enforcement for rules that agents keep missing.
- Do not add new docs under ignored paths; `docs/` and `.planning/` are tracked knowledge.
