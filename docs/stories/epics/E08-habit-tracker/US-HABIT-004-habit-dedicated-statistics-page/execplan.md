# Exec Plan

## Goal

Complete the SPEC1 dedicated Habit statistics page while preserving the existing
Habit schedule, ownership, and timezone rules.

## Scope

In scope:

- Backend stats DTO/service method/controller endpoint.
- TypeScript Habit API client support.
- Protected stats route and link from the Habit grid.
- Focused backend, frontend, and Playwright proof.
- Product, story, Harness, and workflow-state updates.

Out of scope:

- Dashboard Overview.
- Reminders, notifications, preference storage, and background jobs.
- Database migration or aggregate table.

## Risk Classification

Risk flags:

- Public contract: adds a new authenticated read endpoint.
- Existing behavior: reuses and extends Habit stat semantics.
- Weak proof until deterministic longest-streak and rolling-rate tests exist.

Hard gates:

- None.

Lane: normal with stronger validation.

## Work Phases

1. Record intake and story row.
2. Add story packet and current-story docs.
3. Implement backend stats query and deterministic service tests.
4. Implement frontend route, link, styles, and component tests.
5. Add focused Playwright stats flow.
6. Run validation, update evidence, and record trace.

## Stop Conditions

Pause for human confirmation if:

- The story appears to require a schema migration.
- Dashboard aggregation or reminder behavior becomes necessary.
- Existing timezone/streak decisions would need to change.
