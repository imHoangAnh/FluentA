# 0028 Pomodoro Sessions Source Daily Counts

Date: 2026-06-12

## Status

Accepted

## Context

Daily Pomodoro counts and long-break scheduling need a durable source of truth.
Redis active state can expire and cannot reliably represent completed work.

## Decision

Persist one immutable `PomodoroSession` for every completed Work phase.
Calculate daily counts from PostgreSQL using a client-offset local-day window.
Use the total completed Work count to choose each configured long break.

## Alternatives Considered

1. Increment counters in Redis. Rejected because cache loss would erase history
   and make long-break scheduling inconsistent.

## Consequences

Positive:

- Counts and break scheduling survive cache loss and restarts.
- Session ownership is enforced by repository queries.

Tradeoffs:

- Each completed Work phase performs a database insert and count query.

## Follow-Up

- Add task linking and a session-history UI in a later story.
