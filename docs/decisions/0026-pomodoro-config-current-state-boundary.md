# 0026 Pomodoro Config And Current State Boundary

Date: 2026-06-12

## Status

Accepted

## Context

SPEC1 defines Pomodoro configuration, Redis-backed active timer state, session
history, SignalR sync, task linking, and stopwatch behavior. Implementing all
of that in one story would mix durable config, volatile timer state, cross-tab
sync, task ownership, and UI timer accuracy.

## Decision

Split Pomodoro into story-sized slices. `US-POMO-001` owns durable per-user
configuration and a read-only current-state endpoint. It stores config in
Postgres, reads current timer state from Redis, and returns an idle fallback
when no active Redis state exists. Timer mutation commands, SignalR
`PomodoroSync`, session history, task linking, and stopwatch behavior remain
deferred.

## Alternatives Considered

1. Implement the entire Pomodoro feature in one story. Rejected because it
   would create a broad API, Redis, SignalR, database, and UI blast radius.
2. Keep configuration client-only until timer controls exist. Rejected because
   SPEC1 requires saved per-user configuration that applies across sessions.

## Consequences

Positive:

- Later timer-control work has a stable config and current-state contract.
- The first slice can be validated without simulating long-running timers.

Tradeoffs:

- `/pomodoro/current` initially returns idle fallback state until mutation
  endpoints are implemented.
- SignalR sync proof is deferred to the story that introduces timer mutation.

## Follow-Up

- Implement start/pause/resume/reset/complete commands.
- Add `PomodoroSync` broadcasts after timer state mutations.
- Add completed Pomodoro session persistence and daily count.
- Add Todo/Kanban task linking and stopwatch UI.
