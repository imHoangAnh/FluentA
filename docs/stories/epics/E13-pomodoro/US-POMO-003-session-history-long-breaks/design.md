# Design

## Domain Model

`PomodoroSession` is an immutable user-owned record of one completed phase.
US-POMO-003 persists completed Work phases; break completion remains a timer
transition only.

## Application Flow

Completing Work persists a session, counts the user's completed Work sessions,
then starts LongBreak when the count is divisible by `longBreakAfter`;
otherwise it starts ShortBreak. Completing either break starts Work.

## Interface Contract

`GET /api/v1/pomodoro/today?utcOffsetMinutes=N` returns the authenticated
user's completed Work count for the client's local day.

## Data Model

Add `pomodoro_sessions` and an index on `(user_id, completed_at)`.

## UI / Platform Impact

The Pomodoro timer card displays `Completed today: N`.

## Observability

Harness evidence records migration, transition, ownership, API, and UI proof.

## Alternatives Considered

1. Store the daily count in Redis. Rejected because completed sessions are the
   durable source of truth and counts must survive cache loss.
