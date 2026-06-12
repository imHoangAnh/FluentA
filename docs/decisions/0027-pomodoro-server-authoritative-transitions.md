# 0027 Pomodoro Server-Authoritative Transitions

Date: 2026-06-12

## Status

Accepted

## Context

Cross-tab timers drift or conflict when each browser owns state transitions.
Redis must remain the shared authority without requiring a write every second.

## Decision

Persist timer transition snapshots in Redis and compute running remaining time
from server timestamps. Mutations persist before broadcasting `PomodoroSync`.
Manual complete transitions Work to ShortBreak and breaks to Work. Long-break
scheduling is deferred until durable completed-session counts exist.

## Alternatives Considered

1. Write remaining seconds to Redis every second. Rejected due to unnecessary
   write load and coordination complexity.
2. Let each browser own countdown state. Rejected because tabs would drift and
   conflict.

## Consequences

- Redis writes happen only on transitions.
- Clients may display a local countdown but reconcile from server state.
- Automatic completion and long-break scheduling remain follow-up work.
