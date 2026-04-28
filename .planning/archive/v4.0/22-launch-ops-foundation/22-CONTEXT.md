# Phase 22: Launch Ops Foundation -- Context

## Phase Goal
Production environment is correctly configured with rotated secrets and pending migrations applied.

## Requirements Covered
- `OPS-01`: All exposed secrets (DB password, `JWT_SECRET`, `SetlistFM` key) rotated in Railway production environment.
- `OPS-02`: `NODE_ENV=production` set, all third-party env vars configured in Railway (`Sentry`, `Firebase`, `Resend`, `RevenueCat`, `R2`, `Cloudflare`).
- `OPS-03`: Migration `039` applied to production DB and demo seed data populated.

## What Already Exists
- `backend/.env.example` already documents every required Tier 1-3 variable plus the Railway launch checklist and explicit secret-rotation notes.
- `backend/DEPLOYMENT.md` already contains the Railway deploy, rollback, Sentry, staging, and post-deploy verification runbook created during Phase 16.
- `railway.toml` already starts production with `cd backend && npm run migrate:up && npm start`, so production deploys automatically apply pending migrations.
- `backend/migrations/039_replace-social-auth-sentinel.ts` already exists and was previously verified in the v2.0 audit, but the v2.0 audit still lists running it in production as a manual follow-up.
- `backend/src/scripts/seed-demo.ts` already exists and seeds five demo accounts, but it warns and exits early if base venue/band seed data is missing.
- `.planning/milestones/v2.0-AUDIT.md` still records the unresolved manual launch blockers that this phase is intended to close: secret rotation, `NODE_ENV=production`, third-party env parity, migration `039`, and `npm run seed:demo`.

## Key Design Decisions
- Keep Phase 22 as a single plan because the roadmap estimates one plan and all work happens sequentially inside the same production environment.
- Require a sanitized evidence artifact in `.planning/phases/22-launch-ops-foundation/22-01-OPS-EVIDENCE.md` so execution records completion timestamps, operators, and blockers without ever committing secret values, tokens, DSNs, or database URLs.
- Treat `seed-demo.ts`'s base-data dependency as part of the plan instead of a surprise during execution. If demo seeding reports missing venues/bands, the executor must run `npm run seed` first, then rerun `npm run seed:demo`.
- Architecture proposals: skipped by assumption because the user directly invoked `/legion:plan 22` and this phase is operational rather than architectural.
- Spec pipeline: skipped by assumption because the phase scope is already concretely defined in `ROADMAP.md`, `REQUIREMENTS.md`, `.env.example`, and `DEPLOYMENT.md`.
- Recommended execution agent: `engineering-devops-automator`, because the phase is dominated by deployment configuration, secret rotation, migration application, and operational verification rather than product or code-architecture work.

## Plan Structure
- **Plan 22-01 (Wave 1)**: Production secrets, Railway environment parity, migration `039`, demo seed, and launch verification -- closes `OPS-01`, `OPS-02`, and `OPS-03` with a single execution record.
