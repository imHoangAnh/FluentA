# Exec Plan

## Goal

Persist completed work sessions, expose today's count, and schedule long breaks.

## Scope

In scope:

- Completed Work session persistence.
- Owner-scoped daily count.
- Long-break interval scheduling.
- Pomodoro page daily count.

Out of scope:

- Automatic completion, task linking, notifications, stopwatch, history UI.

## Risk Classification

Risk flags:

- Data model.
- Public contracts.
- Existing behavior.

Hard gates:

- Data migration.

## Work Phases

1. Record contract and decision.
2. Add domain entity, repository operations, and migration.
3. Update completion transition and today query.
4. Add API and UI.
5. Verify unit, integration, E2E, and platform checks.
6. Update Harness evidence.

## Stop Conditions

Pause for human confirmation if session retention, deletion, or task-linking
scope must change.
