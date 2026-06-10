# Exec Plan

## Goal

Deliver configurable global daily allowances and All Words Spaced due queues.

## Scope

In scope:

- Review-settings entity, migration, owner-scoped read/update API, and UI.
- Learner-local day-bound calculation.
- Global distinct-card daily allowance accounting.
- Owned All Words due endpoint with overdue, due-today, then new priority.
- Spaced mode in the shared review session.
- Unit, integration, browser, and PostgreSQL proof.

Out of scope:

- Dashboard statistics and charts.
- Durable sessions or summaries.
- Per-board limits.

## Risk Classification

Risk flags:

- Authorization.
- Data model and migration.
- Existing scheduling behavior.
- Public API and user-visible workflow.

## Work Phases

1. Add settings model, mapping, migration, and validation tests.
2. Add timezone day bounds, allowance accounting, and due query.
3. Expose settings/due APIs and protected settings UI.
4. Add All Words Spaced mode while preserving existing modes.
5. Run migration, PostgreSQL, backend, frontend, and browser proof.
6. Update product, story, decision, and Harness evidence.

## Stop Conditions

Pause if distinct-card usage cannot be owner-scoped across All Words decks, if
timezone bounds are ambiguous, or if migration/runtime proof cannot be run.
