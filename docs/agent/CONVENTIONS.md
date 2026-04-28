# Conventions

## TypeScript Backend

- Use strict TypeScript and async/await.
- Keep `camelCase` for values/functions, `PascalCase` for types/classes, and `UPPER_SNAKE_CASE` for constants.
- Group imports as external packages, then local modules.
- Validate request bodies, params, and query strings with Zod before controller logic.
- Use the app logger from `src/utils/logger.ts`; do not add raw `console.log` outside approved scripts/tests.
- Use `AppError` subclasses or existing error helpers for known operational failures.
- Keep tests in `backend/src/__tests__/` and prefer dependency injection/mocks over real provider calls.

## Flutter Mobile

- Use Riverpod providers for shared state and GoRouter for navigation.
- Keep models immutable with Freezed/json_serializable.
- Prefer `const` constructors and existing theme tokens.
- Do not hardcode colors when `Theme.of(context)` or app theme values are available.
- Repository methods should translate API failures into `Failure` values or feature exceptions consistently.
- Generated `*.g.dart` and `*.freezed.dart` files are excluded from analyzer linting and must be regenerated.

## Documentation

- `AGENTS.md` stays short; durable details go under `docs/agent/`.
- Active phase plans remain in `.planning/`; lasting project knowledge is summarized in `docs/agent/`.
- When prose contradicts code, inspect code and update the stale doc.

## Git Hygiene

- Preserve unrelated local changes.
- Keep generated build outputs out of version control.
- Use Conventional Commits when committing: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`.
