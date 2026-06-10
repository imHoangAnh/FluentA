# Exec Plan

## Goal

Deliver board-wide column configuration and durable typed custom values as an
owner-scoped vertical slice.

## Work Order

1. Implement domain model, persistence mappings, service contracts, and tests.
2. Generate and inspect the migration.
3. Add owner-scoped column/value/preference API behavior.
4. Add the settings panel and dynamic table columns.
5. Run migration, API/PostgreSQL, frontend, and browser proof.
6. Update product, decision, story, and Harness evidence.

## Stop Conditions

Pause if atomic destructive deletion cannot be proven, ownership would be
weakened, or custom values would require changing flashcard review content.
