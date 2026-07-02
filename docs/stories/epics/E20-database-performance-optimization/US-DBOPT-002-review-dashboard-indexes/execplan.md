# Exec Plan

## Goal

Align Review dashboard indexes with the actual active-row query predicates.

## Scope

In scope:

- Review state due-date partial index.
- Review history session partial index.
- Review history owner/reviewed-at partial index.
- EF migration and snapshot update.

Out of scope:

- Productivity, Journal, Kanban, Pomodoro, and Vocabulary index passes.
- Full load testing.

## Risk Classification

Risk flags:

- Data model.
- Existing behavior.
- Weak proof.

Hard gates:

- Migration.

Lane: high-risk.

## Work Phases

1. Inspect current index inventory and FK coverage.
2. Add Fluent API index filters/names.
3. Generate migration.
4. Convert migration body to concurrent PostgreSQL index SQL.
5. Apply migration locally and verify index definitions.
6. Record Harness evidence.

## Stop Conditions

Pause for human confirmation if:

- The migration needs a non-concurrent large-table rewrite.
- Existing query behavior changes.
- Rollback cannot recreate the previous index shape.
