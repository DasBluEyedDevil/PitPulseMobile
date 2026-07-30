# Reviewer Guide

This document is the authoritative review guide for pull requests in this repository. It defines how reviewers should approach a PR, what to look for, and how to report findings.

## Mission

Keep the codebase correct, secure, maintainable, and as small as possible. Prefer the laziest solution that actually works: fewer files, fewer dependencies, fewer abstractions, fewer branches, fewer concepts.

## Review Passes

Every pull request requires two review passes. Neither is optional:

1. **Correctness review.** Look for bugs, broken edge cases, security issues, data-loss risks, race conditions, missing validation, bad error handling, broken tests, and regressions.
2. **Ponytail review.** A dedicated simplification pass (see below). Even if there are no findings, the section must appear in the review with the line "Ponytail: Lean already. Ship."

## Review Order

1. **Understand the PR intent.** Read the title, description, linked issue, and changed files. Identify what behavior is supposed to change. Do not suggest simplification until you understand the real requirement.
2. **Review correctness first.** Identify bugs, security issues, data-loss risks, race conditions, missing validation, bad error handling, broken tests, and regressions. Do not let Ponytail remove necessary safety, validation, accessibility, observability, tests, or explicit user-requested behavior.
3. **Then run the Ponytail pass.** Look for unnecessary complexity, prefer deletion over addition, prefer standard library and platform features, and prefer existing project patterns over new abstractions.

## Ponytail Pass

Ponytail looks for unnecessary complexity. Search the diff for:

- Dead code, unused flexibility, speculative features, unnecessary branches, unused config, and scaffolding.
- Hand-rolled logic the language standard library already provides.
- Dependencies or custom code doing what the platform or framework already does.
- Abstractions, config, or extension points with no current need.
- Behavior that can be expressed with materially less code.
- New helpers that duplicate an existing project helper or pattern.
- Tests that mostly exercise mocks, framework behavior, or implementation details rather than useful behavior.
- Documentation or comments that explain obvious code or defend unnecessary complexity.
- Wrappers around simple APIs.
- Factories, registries, service layers, interfaces, adapters, or config that have only one use.

### Ponytail Tags

Use these tags on every Ponytail finding:

- `delete` — dead code, unused flexibility, speculative feature, unnecessary branch, unused config, or scaffolding.
- `stdlib` — hand-rolled logic the language standard library already provides.
- `native` — dependency or custom code doing what the platform or framework already does.
- `yagni` — abstraction, config, or extension point with no current need.
- `shrink` — same behavior can be expressed with materially less code.
- `reuse` — new helper duplicates an existing project helper or pattern.
- `test-shrink` — test can be simpler while preserving meaningful coverage.

### Finding Format

Each Ponytail finding must be concise and actionable:

```
<file>:L<line>: <tag> <what to cut>. <what replaces it>.
```

Examples:

- `src/cache.ts:L42`: `stdlib` custom LRU cache. Replace with `Map` plus a size cap, or use the existing cache helper in `src/lib/cache.ts`.
- `app/services/UserService.ts:L18`: `yagni` `IUserService` has one implementation and one caller. Delete the interface and inject `UserService` directly.
- `src/validators/email.ts:L7`: `native` regex-based email parser. Use the platform or existing email validation already used in `FormInput`.
- `tests/user.test.ts:L88`: `test-shrink` five mocked repository tests cover the same branch. Keep one behavior test through the public API.
- `src/config.ts:L31`: `delete` `FEATURE_X_STRATEGY` has one value and no callers override it. Inline the value.

If there are no Ponytail findings, say exactly:

> Ponytail: Lean already. Ship.

Do not invent findings. If the code is already simple, say so.

### Boundaries

The Ponytail pass must not propose removing:

- Required input validation.
- Security checks.
- Error handling that prevents data loss or silent failure.
- Accessibility basics.
- Tests that protect non-trivial behavior.
- Logging or metrics that are operationally necessary.
- Behavior explicitly required by the PR or linked issue.

Do not prefer clever one-liners over readable code when the readable version prevents mistakes. Do not block a PR only because the code could be shorter; block only for correctness, security, data-loss, or maintainability risks.

### Net Estimate

End the Ponytail section with an estimated line count:

> Ponytail net: -<estimated removable lines> lines.

If nothing is removable:

> Ponytail net: 0 lines.

## Review Output Format

Every review must follow this structure exactly.

### Verdict

One of:

- **Approve**
- **Request changes**
- **Comment only**

Followed by one short sentence explaining why.

### Correctness / Safety Findings

List only real correctness, safety, security, regression, or test issues.

Format:

```
<severity>: <file>:L<line>: <issue>. <required fix>.
```

Severities:

- `critical` — bug, security, or data-loss risk; must fix before merge.
- `important` — likely defect or maintainability hazard; should fix before merge.
- `minor` — small issue, typo, naming, or clarity problem.

If none, say:

> No correctness or safety findings.

### Ponytail Review

Always include this section, even when empty. Use the exact finding format above, or the line "Ponytail: Lean already. Ship." End with the net estimate.

### Suggested Minimal Patch

If there are actionable findings, describe the smallest safe patch set.

- Prefer the fewest files changed.
- Prefer deleting code.
- Do not introduce new dependencies unless absolutely necessary.
- Do not propose a broad refactor when a local fix solves the issue.
- Keep this section short.

If no patch is needed, say:

> No patch needed.

### Final Merge Guidance

State clearly whether the PR can merge, for example:

- Can merge after the critical finding is fixed.
- Can merge; Ponytail suggestions are optional cleanup.
- Do not merge until tests cover the changed behavior.
- Can merge as-is.

## Behavioral Rules

- Be direct. Be specific. Do not write long essays.
- Do not praise boilerplate.
- Do not ask the author to "consider" vague changes.
- Every finding must identify exactly what should change.
- If a simplification is optional, mark it as optional.
- If a simplification is required because the complexity creates real risk, explain the risk in one sentence.
- Never treat a tool, test, or CI self-report as proof if the diff itself contradicts it.
- Prefer the smallest root-cause fix over patches scattered across callers.

## Mandatory Per-PR Checklist

Before posting a review, confirm every item:

- Did I review correctness and security first?
- Did I run a separate Ponytail pass?
- Did I look for code to delete?
- Did I look for standard-library or platform replacements?
- Did I look for one-implementation interfaces, factories, and adapters?
- Did I look for speculative config and extensibility?
- Did I avoid removing required validation, security, or tests?
- Did I include either Ponytail findings or the line "Ponytail: Lean already. Ship."?