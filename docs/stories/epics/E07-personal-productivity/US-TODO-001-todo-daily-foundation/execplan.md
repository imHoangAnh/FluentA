# Exec Plan

## Goal

Deliver the Todo daily foundation: user-owned Todo persistence, authenticated
CRUD API, on-access carry-over, protected day-view UI, and focused validation
proof.

## Scope

In scope:

- `TodoItem` domain entity and validation rules.
- EF Core table, indexes, and migration.
- Todo application service and repository.
- Authenticated Todo API for date list, create, patch, and delete.
- On-access carry-over for incomplete past tasks.
- Post-commit `TodoItemChecked` SignalR event for completion changes if
  validation confirms the notifier path.
- Protected `/todo` day page with inline add, completion toggle, delete, day
  navigation, and carried-over indicator.
- Product doc, story evidence, Harness matrix row, and trace updates.

Out of scope:

- Week view.
- Desktop drag-and-drop reorder or date movement.
- Countdown.
- Dashboard aggregation.
- Scheduled background jobs.
- Habit, Journal, Kanban, Pomodoro.

## Risk Classification

Risk flags:

- Authorization.
- Data model and migration.
- Public API contract.
- User-visible workflow.
- Weak proof until new tests are added.

Hard gates:

- Authorization.
- Data model.
- Public API shape.

Lane: `high-risk`

## Work Phases

1. Validate feasibility for date representation, migration shape, carry-over
   idempotency, and SignalR notifier approach.
2. Implement Todo domain, DTOs, service, errors, and unit/application tests.
3. Implement EF configuration, repository, migration, dependency injection, and
   API controller.
4. Implement frontend API module, protected route, day-view UI, navigation
   entry, and route/component tests.
5. Add focused E2E/API proof for daily Todo lifecycle and carry-over.
6. Update story evidence, Harness matrix row, and trace.

## Stop Conditions

Pause for human confirmation if:

- The implementation would require changing source-of-truth hierarchy or
  architecture direction.
- Date representation cannot be made reliable without changing the public API
  shape from `YYYY-MM-DD`.
- Migration cannot be generated or applied in the current environment.
- Carry-over cannot be made idempotent on access.
- Validation requirements need to be weakened.
