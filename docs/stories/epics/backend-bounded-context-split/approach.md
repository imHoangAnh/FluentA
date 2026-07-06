# Approach: Backend Bounded Context Split

## Recommended Work Shape

Mode: `high_risk_feature`

Why smaller modes are insufficient:

- The feature changes backend ownership, public API routes, EF schema mapping,
  migrations, frontend API clients, and test contracts together.
- The current mixed `Flashcards` backend is a working production-shaped path
  for Flashcard, Practice, Review, dashboard, settings, and SRS behavior.
- The Vocabulary sync path is deeply coupled to Flashcard deck/card persistence
  and must be split without losing current atomic behavior.

Use an epic map and validate the first contract-mapping story before execution
beads. Do not start the code split until the endpoint/entity/table mapping is
approved.

## Recommended Sequence

1. Produce a complete current-to-target map for endpoints, DTOs, services,
   repositories, domain entities, EF tables, migrations, frontend calls, and
   tests.
2. Split domain ownership into Flashcards, Practice, and Review namespaces
   while preserving current behavior.
3. Split application services and ports so each controller can call only its
   own context service.
4. Split infrastructure repositories and EF configuration by context.
5. Move learning tables into `flashcards`, `practice`, and `review`
   PostgreSQL schemas using the approved dev reset or preserve-data migration
   strategy.
6. Split API controllers and remove old compatibility routes during the same
   cutover.
7. Update frontend API clients, route flows, settings, dashboard, Vitest, and
   Playwright tests to the new endpoint contract.
8. Rework Vocabulary sync/cleanup through context-owned handlers and prove
   Flashcard card sync plus Review cleanup behavior.
9. Run release proof across Flashcard viewer, Practice, Add to Review, Review,
   dashboard/stats, settings, ownership, endpoint remnants, and EF schema
   boundaries.

## Rejected Alternatives

1. Keep the old `FlashcardService` as an orchestration facade over the new
   contexts.
   Rejected because Feature 20 explicitly wants bounded contexts with each
   controller calling its corresponding application service.
2. Keep legacy endpoints during a compatibility window.
   Rejected because the locked decision is a one-time cutover that updates
   frontend/tests and removes old endpoints in the same feature.
3. Introduce a shared Learning kernel for common enums/value objects.
   Rejected because the locked decision prefers duplicated small values mapped
   through explicit contracts.
4. Introduce broker/outbox-based Vocabulary events now.
   Rejected unless validation proves synchronous handlers cannot preserve the
   current transaction guarantees.

## Risk Map

| Component | Risk | Reason | Proof Needed |
| --- | --- | --- | --- |
| API cutover | HIGH | Old and new endpoint families overlap, and tests still reference legacy routes. | Route scan, API tests, frontend build, Vitest, focused Playwright. |
| Vocabulary sync | HIGH | Vocabulary currently imports Flashcard types and writes deck/card tables directly. | Integration proof for create/update/delete and Review cleanup. |
| EF schema move | HIGH | Table schema ownership changes can lose data if migration posture is wrong. | Migration/model snapshot review and dev-reset or preserve-data proof. |
| SRS ownership | HIGH | Review must become the only owner of state/history/scheduler/dashboard stats. | Domain/application tests and architecture review. |
| Practice-to-Review port | HIGH | Add to Review must create missing Level 0 state without direct Practice writes. | Port-level test proving Practice delegates and Review owns writes. |
| Frontend stale calls | MEDIUM | `flashcard.api.ts` and E2E specs reference mixed endpoint families. | Static scan plus frontend test ladder. |
| Settings aggregation | MEDIUM | Profile settings aggregate Practice and Review settings from backend DTOs. | Settings page and API proof after service split. |

## Likely File Boundaries

- Backend API:
  `src/backend/FluentA.API/Controllers/FlashcardsController.cs`,
  `PracticeController.cs`, `ReviewController.cs`
- Backend application:
  `src/backend/FluentA.Application/BoundedContexts/Flashcards/*`,
  `src/backend/FluentA.Application/BoundedContexts/Practice/*`,
  `src/backend/FluentA.Application/BoundedContexts/Review/*`
- Backend domain:
  `src/backend/FluentA.Domain/BoundedContexts/Flashcards/*`,
  `src/backend/FluentA.Domain/BoundedContexts/Practice/*`,
  `src/backend/FluentA.Domain/BoundedContexts/Review/*`
- Backend infrastructure:
  `src/backend/FluentA.Infrastructure/Flashcards/*`,
  `src/backend/FluentA.Infrastructure/Practice/*`,
  `src/backend/FluentA.Infrastructure/Review/*`,
  `src/backend/FluentA.Infrastructure/Persistence/*`
- Vocabulary integration:
  `src/backend/FluentA.Application/BoundedContexts/Vocabulary/*`,
  `src/backend/FluentA.Infrastructure/Vocabulary/*`
- Frontend:
  `src/frontend/src/lib/api/flashcard.api.ts`,
  route files under `src/frontend/src/routes/flashcards`,
  `src/frontend/src/routes/settings`,
  dashboard route usage, Vitest, and Playwright specs.

## Validation Ladder

1. Contract/story validation for `US-BC-001`.
2. Backend domain and application unit tests for context-owned behavior.
3. Backend integration/API tests for endpoints, owner scope, SRS writes, and
   Vocabulary sync/cleanup.
4. EF migration script/model snapshot review for schema ownership.
5. Frontend lint, Vitest, and build.
6. Focused Playwright for Flashcard viewer, Practice, Add to Review, Review,
   dashboard/stats, and settings.
7. Static scan proving old endpoint strings and legacy controller routes are
   removed.
8. Harness story verification and matrix refresh.

## Open Checks For The First Story

- Confirm exact target endpoint names for Practice session creation and Review
  dashboard/stats before implementation.
- Decide whether dev migration will be a destructive reset migration only or
  whether the story must include a preserve-data migration script now.
- Decide whether context-owned Vocabulary sync is implemented as synchronous
  in-process handlers inside the current transaction or as direct application
  service calls hidden behind explicit ports.
- Decide how to handle legacy domain types such as `CardReview`, `CardState`,
  and `ReviewRating` if they are no longer part of shipped Review behavior.
