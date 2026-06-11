# Exec Plan

## Goal

Establish the Habit Tracker backend and API foundation so later stories can
build the monthly grid, statistics, synchronization, and Dashboard widgets on a
sound user-owned data model.

## Scope

In scope:

- Habit and HabitEntry domain entities.
- Daily and custom weekday schedules.
- Create, list, patch, delete, monthly entries query, and entry toggle API
  endpoints.
- Validated browser timezone requirement for schedule-sensitive calls.
- API rejection of future, unscheduled, invalid, deleted, and foreign-user
  operations.
- PostgreSQL migration with unique `(habit_id, date)` entry invariant.
- Backend unit/integration-style tests and focused API/PostgreSQL proof.
- Minimal frontend API client only if useful for compile-time contract proof.
- Product/story/Harness evidence updates.

Out of scope:

- Habit page monthly grid.
- Per-habit stats page.
- Authenticated cross-tab Habit listener and E2E.
- Dashboard Overview integration.
- Reminder preferences, scheduled jobs, and notifications.

## Risk Classification

Risk flags:

- Data model.
- Public contracts.
- Existing behavior.
- Multi-domain.
- Weak proof.

Hard gates:

- Public API and data-model work require high-risk story evidence.
- Future or unscheduled date toggles must be rejected server-side.
- Unique entry persistence must be proven against PostgreSQL, not only in fake
  repositories.

## Work Phases

1. Define domain entities, schedule rules, DTOs, repository/service contracts,
   and application validation.
2. Add EF configuration, repository implementation, migration, dependency
   injection, controller, and optional post-commit notifier interface.
3. Add deterministic unit tests for validation, schedules, ownership, and
   toggle semantics.
4. Run migration and focused API/PostgreSQL proof, including the unique entry
   invariant.
5. Update product docs, Harness matrix evidence, and trace.

## Stop Conditions

Pause for human confirmation if:

- Reminder settings, notification delivery, or jobs become necessary for the
  foundation story.
- A data migration would modify existing user-owned data outside adding Habit
  tables.
- PostgreSQL cannot safely enforce or recover from the unique entry invariant
  for entry toggles.
- API contract direction needs to diverge from `SPEC1.md` or locked decisions.

