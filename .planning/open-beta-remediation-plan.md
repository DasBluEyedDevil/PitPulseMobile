# SoundCheck Open-Beta Remediation Plan

## Context

Resolve all 24 findings from the frozen open-beta audit at
`cfc9eb624691070ba578da8412ec89cda95c3beb`, close beta-critical evidence
gaps, and produce a new independently verified beta decision for the backend,
Android, iOS, and release-dependent web surface.

The remediation branch starts from the refreshed `origin/main` value
`cfc9eb624691070ba578da8412ec89cda95c3beb`. The configured checkout and the
detached audit worktree must remain untouched.

## Global Constraints

- Android application ID: `com.soundcheck.app`.
- iOS application ID: `com.9thlevelsoftware.soundcheck`.
- AASA team ID: `BDJDR669ZV`.
- Keep Firebase iOS and AASA on the authoritative iOS application ID.
- Update Fastlane, App Store Connect documentation, RevenueCat iOS
  documentation/configuration, and all other release identity references to
  the authoritative iOS application ID.
- Standardize Node 24 and npm 11 in package engines, `.node-version`, CI,
  Nixpacks, Railway, and retained release evidence.
- Use `npm ci` for reproducible backend, root-tooling, and web dependency
  restoration. Do not introduce an `npm install` release path.
- Secrets, Firebase configuration, keystores, signing passwords, store
  credentials, device logs, and synthetic-user credentials remain untracked
  and redacted.
- Do not hand-edit generated Dart files or generated backend `dist/` output.
- Flutter Windows and macOS desktop targets are outside this mobile release
  scope. Exclude their generated scaffolding, builds, tests, and coverage from
  remediation evidence. This does not remove iOS or the release-dependent
  static web surface from scope.
- Do not change public HTTP routes or domain-schema contracts unless executable
  contract reconciliation proves a specific incompatibility.
- Every phase must include a finding-to-test table. Runtime, signing,
  deployment, and device findings cannot be closed by static inspection alone.
- Every P0/P1 and release-blocking P2 needs reproduction by a reviewer other
  than its implementer.
- Each subsystem needs an independent sample of at least 10% of files marked
  reviewed-clean.
- Do not open beta until Phase 35 passes. Missing credentials, macOS/iOS
  capability, signed devices, store access, staging access, or the 24-hour
  observation period are blockers, not evidence to waive.

## Required Interfaces

- Add backend script `npm run migrate:deploy`.
- `migrate:deploy` must hold a PostgreSQL advisory lock across:
  1. an idempotent base-schema bootstrap migration recorded in a separate
     `pgmigrations_bootstrap` table;
  2. the existing ordered migration chain.
- Add release-only inputs:
  - `SOUNDCHECK_GOOGLE_SERVICES_JSON_PATH`
  - `SOUNDCHECK_ANDROID_KEYSTORE_PATH`
  - `SOUNDCHECK_ANDROID_KEYSTORE_PASSWORD`
  - `SOUNDCHECK_ANDROID_KEY_ALIAS`
  - `SOUNDCHECK_ANDROID_KEY_PASSWORD`
- Change `BadgeService.awardBadge(...)` to return `Promise<boolean>` indicating
  whether the badge row was inserted.
- Add one internal mobile post-authentication session bootstrap shared by
  password, registration, Google, Apple, restored-session, and account-switch
  flows.
- Add public `/.well-known/assetlinks.json`, generated from the Android release
  certificate and containing its verified SHA-256 fingerprint.

## Task 1: Phase 29 — Reproducible Release Foundation

Create versioned Phase 29–35 execution plans under `.planning/phases/`, each
with scope, finding-to-test traceability, acceptance criteria, evidence
boundaries, and rollback/deployment notes.

Freeze a new remediation snapshot containing the baseline SHA, refreshed remote
identity, required tool versions, lock hashes, redacted credential-presence
flags, authoritative store identities, and deployment targets.

Standardize Node 24/npm 11 in Nixpacks, Railway, CI, `.node-version`, and package
engines. Restore backend and web dependencies exclusively with `npm ci`.

Track the standard Gradle wrapper scripts and JAR and remove their ignore rules.

Add fail-fast Android release configuration:

- copy `google-services.json` from
  `SOUNDCHECK_GOOGLE_SERVICES_JSON_PATH` before Gradle;
- require all five Android release inputs for release tasks;
- remove debug-signing fallback;
- verify the resulting release certificate fingerprint without exposing
  signing material.

Align all iOS Fastlane identifiers with
`com.9thlevelsoftware.soundcheck`. Create Debug and Release/Profile entitlement
files so archives request production APNs.

Add CI gates for format checks, fresh coverage, production dependency audit,
licenses, generated-code drift, Android release configuration, backend
integration services, and web build.

Close only with evidence: MOB-OB-001, MOB-OB-002, MOB-OB-003, MOB-OB-004,
MOB-OB-013, OB-BE-005, and OB-COORD-004.

## Task 2: Phase 30 — Backend Bootstrap, Startup, and Runtime Assets

Add `bootstrap-migrations/000_create-base-tables.ts`, delegating to the
idempotent schema builder extracted from migration 044 and recording execution
in `pgmigrations_bootstrap`.

Add an operator migration runner that holds a PostgreSQL advisory lock across
bootstrap and normal migrations. Use `npm run migrate:deploy` from both Railway
and Nixpacks.

Test:

- empty-database bootstrap;
- existing-production-history upgrade;
- rollback and re-upgrade;
- concurrent deploy attempts;
- interrupted migration recovery.

Branch startup on `healthResult.healthy`; do not initialize the HTTP listener,
WebSocket server, workers, or schedulers when PostgreSQL is unhealthy.

Replace the invalid font with Inter Bold v4.1 from its OFL distribution,
retaining license and provenance. Copy the font and share landing template into
`dist`, and add a build validator for existence, font signature, and compiled
path resolution. Test one built Wrapped landing route, one check-in landing
fallback, and one uncached Satori render.

Upgrade direct and transitive dependencies until
`npm audit --omit=dev` reports zero unresolved vulnerabilities, including the
Axios, Multer, ws, gRPC, protobuf, form-data, Sentry/OpenTelemetry, and
brace-expansion ranges.

Make badge insertion use `ON CONFLICT DO NOTHING RETURNING`, return
`Promise<boolean>`, and emit audit, notification, and realtime effects only
when insertion succeeds.

Close only with evidence: OB-BE-001, OB-BE-002, OB-BE-003, OB-BE-004,
OB-BE-007, and OB-BE-008.

## Task 3: Phase 31 — Mobile Session and Release Correctness

Extract one `bootstrapAuthenticatedSession(user)` operation from the auth
notifier and invoke it exactly once after every successful authentication or
restored-account transition.

Bootstrap:

- WebSocket credentials;
- RevenueCat identity and server entitlement state;
- saved genres;
- push registration;
- session-scoped provider invalidation.

Treat integration failures as observable, retryable degradation. Do not erase a
valid authenticated session or overwrite a known premium entitlement.

Add tests proving password, registration, Google, Apple, refresh restoration,
logout, and account switching share identical session behavior.

Update RevenueCat iOS configuration and store documentation to
`com.9thlevelsoftware.soundcheck`; leave Android on `com.soundcheck.app`.

Close only with evidence: MOB-OB-012 and the remaining identity/session portions
of MOB-OB-003 and MOB-OB-004.

## Task 4: Phase 32 — Web Associations, Branding, and Store Assets

Generate and version `assetlinks.json` using `com.soundcheck.app` and the
verified Android release-certificate SHA-256 fingerprint. Validate AASA against
team `BDJDR669ZV` and `com.9thlevelsoftware.soundcheck`.

Build and probe reset-password, delete-account, support, legal, Wrapped, and
share URLs for status, content type, redirects, and deep-link behavior.

Replace the mislabeled header image with a real PNG and add the referenced
favicon and Open Graph image.

Generate Android adaptive and legacy icons plus the iOS icon catalog from the
current flash mark. Validate dimensions, alpha rules, safe zones, and
signed-install appearance.

Capture five current Android and corresponding iOS screenshots from the release
candidate and remove obsolete lime UI screenshots.

Stop bundling source/generated brand directories. Declare only
runtime-consumed assets and move source artwork under non-bundled store/design
storage.

Apply backend Prettier and Dart formatting as isolated mechanical changes and
make both checks mandatory in CI.

Close only with evidence: MOB-OB-005, MOB-OB-006, MOB-OB-007, MOB-OB-008,
MOB-OB-009, MOB-OB-010, OB-COORD-003, and OB-COORD-005.

## Task 5: Phase 33 — Contract and Regression Hardening

Repair the PostgreSQL integration suite for the final events schema and close
all pools, Redis clients, workers, timers, and servers without Jest force-exit.
Run PostgreSQL and Redis service containers in CI and require ordered bootstrap
before integration tests.

Enforce minimum coverage:

- backend: 60% statements/lines and 50% branches/functions;
- mobile: 40% global line coverage;
- auth, check-in/photo, feed/realtime/push, account lifecycle, sharing, and
  subscription modules: at least 70% line coverage.

Convert the 160-row HTTP matrix into executable or mechanically verified
contracts. Classify every route as mobile-used, operational/admin, public, or
deliberately removed. Cover auth, validation, canonical errors, status codes,
request/response models, and effects.

Add producer/consumer tests for WebSocket, push, deep-link, email-link, queue,
webhook, and sharing contracts.

Add mobile repository/provider/widget/integration tests for every critical
journey family, including negative, offline, malformed, timeout, and retry
cases.

Close only with evidence: OB-BE-006 and MOB-OB-011.

## Task 6: Phase 34 — Staging and Signed-Device Certification

Deploy staging from the exact remediation SHA and record immutable backend, web,
APK/AAB, archive, and IPA hashes.

Apply migrations to empty and sanitized production-like databases; verify
rollback/re-upgrade and data constraints.

Test every route class with unauthenticated, ordinary, second, blocked, premium,
non-premium, and administrator identities.

Exercise PostgreSQL/Redis failure and recovery, queues, WebSocket
multi-instance fan-out, concurrency/idempotency, cache invalidation, shutdown,
and a 24-hour staging soak.

Prove R2, Firebase/FCM, APNs, email, Google/Apple login, RevenueCat
purchases/restores/webhooks, moderation, event providers, Sentry, analytics,
and public links with sandbox credentials.

Run signed Android and iOS builds on minimum/current OS versions and
representative phone/tablet sizes. Complete camera, gallery, location,
notification, secure storage, lifecycle, process-death, account-switch,
accessibility, text-scaling, orientation, offline, performance, and
battery/reconnect testing.

Require zero crashes, ANRs, data-loss events, duplicate payment/badge side
effects, dead taps, inaccessible beta-critical controls, and uncleaned
synthetic data.

Record unavailable external inputs and capabilities as blockers; do not convert
them into PASS using static inspection or mocks.

## Task 7: Phase 35 — Re-Audit and Open-Beta Rollout

Regenerate the complete audit at the remediation SHA: file ledger, matrices,
scenarios, findings, snapshot, integrity report, and beta decision.

Require:

- 100% ledger disposition and exact hashes;
- 100% semantic contract and critical-flow coverage;
- no blocked beta-critical scope;
- zero unresolved P0, P1, or release-blocking P2 findings;
- zero unverified release blockers;
- clean builds, tests, migrations, signed artifacts, staging integrations, and
  device journeys.

Promote the exact artifacts first to Play Internal Testing and TestFlight
internal testers. Observe backend health, Sentry, queues, WebSockets, uploads,
push, login, and purchases for 24 hours.

Run only allowlisted production HEAD/GET health, association, legal/support, and
public fixture smoke tests. Open external beta only after an independent final
reviewer issues APPROVE.

Roll back application images/artifacts on regression. Migrations remain
forward-compatible and non-destructive.

If any required external certification evidence is unavailable, produce a
truthful FAIL/BLOCKED decision listing the missing evidence and do not promote
or open beta.
