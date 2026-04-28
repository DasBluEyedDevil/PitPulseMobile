# Architecture

## Monorepo

SoundCheck has two shipped surfaces:

- `backend/`: Express API in TypeScript, PostgreSQL for persistence, Redis/BullMQ for caching and jobs, Sentry for errors, Railway/Nixpacks for deployment.
- `mobile/`: Flutter app using Riverpod, GoRouter, Dio, Freezed/json_serializable, Firebase/Sentry, and platform secure storage.

## Backend Boundaries

Request flow is:

1. `src/index.ts` wires process setup, middleware, routes, health checks, and shutdown.
2. `src/routes/` maps HTTP endpoints to controllers and middleware.
3. `src/controllers/` owns request/response handling and calls services.
4. `src/services/` owns business logic, database orchestration, jobs, and external providers.
5. `src/config/` owns PostgreSQL and Redis configuration.
6. `src/utils/` owns shared concerns such as auth, logging, validation, cache, websocket, and mapping helpers.
7. `src/types/` contains shared TypeScript domain and API types.

Controllers should not embed SQL or provider logic. Services should not depend on Express response objects. Cross-cutting concerns must enter through explicit utilities or middleware.

## Mobile Boundaries

Feature code lives under `mobile/lib/src/features/{feature}/`:

- `domain/`: immutable models and feature types.
- `data/`: repositories and API mapping.
- `presentation/`: screens, widgets, and Riverpod providers.

App-wide concerns live under `mobile/lib/src/core/`; reusable UI/utilities live under `mobile/lib/src/shared/`.

Generated Dart files are implementation artifacts. Update the source annotations and rerun build_runner rather than editing generated output.

## Integration Contracts

- Backend API responses use the common `{ success, data?, message?, error? }` shape.
- Backend request validation uses Zod schemas at route boundaries.
- Mobile repositories map Dio failures through `DioClient.handleDioError` or feature-specific failures.
- JWT auth is issued by the backend and stored by mobile in secure storage.
- Generated backend `dist/` output is not the source of truth; Railway builds from `backend/src`.
