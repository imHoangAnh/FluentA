# Exec Plan

## Goal

Deliver Countdown events: user-owned persistence, authenticated CRUD API,
protected desktop route, live client-side countdown display, completed state,
and focused validation proof.

## Scope

In scope:

- `CountdownEvent` domain entity and validation rules.
- EF Core table, indexes, and migration.
- Countdown application service and repository.
- Authenticated Countdown API for list, create, patch, and delete.
- Protected `/countdown` page with inline create/edit, delete confirmation,
  optional color/icon, sorted cards, live remaining time, and completed state.
- Product doc, story evidence, Harness matrix row, and trace updates.

Out of scope:

- Dashboard aggregation.
- Scheduled alert jobs.
- Browser notifications.
- Habit, Journal, Kanban, Pomodoro.
- Todo week planning and drag-and-drop.

## Risk Classification

Risk flags:

- Authorization.
- Data model and migration.
- Public API contract.
- User-visible workflow.

Hard gates:

- Authorization.
- Data model.
- Public API shape.

Lane: `high-risk`

## Work Phases

1. Validate timestamp representation, migration shape, and completed-state logic.
2. Implement Countdown domain, DTOs, service, errors, and tests.
3. Implement EF configuration, repository, migration, dependency injection, and API controller.
4. Implement frontend API module, protected route, page UI, navigation entry, and route tests.
5. Add focused E2E/API proof for Countdown lifecycle and ownership.
6. Update story evidence, Harness matrix row, and trace.

## Stop Conditions

Pause for human confirmation if:

- Timestamp representation cannot be made reliable with ISO strings.
- Migration cannot be generated or applied in the current environment.
- Completed-state behavior requires scheduled job infrastructure.
- Validation requirements need to be weakened.
