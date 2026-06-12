# US-POMO-001: Pomodoro Config And Current State Foundation

## Summary

Implement the first Pomodoro vertical slice from SPEC1 Feature 9: per-user
Pomodoro configuration and a read-only current timer state endpoint.

## User Value

As a logged-in learner, I can configure my Pomodoro work and break durations
and see the server-recognized current timer state before starting a focus
session.

## Scope

In scope:

- Product contract for Pomodoro configuration and current state.
- Domain/application/infrastructure/API support for per-user Pomodoro config.
- Redis-backed current timer state read model with idle fallback.
- Frontend `/pomodoro` page showing and updating config plus current state.
- Focused tests and Harness evidence.

Out of scope:

- Start, pause, resume, reset, and complete timer commands.
- `PomodoroSync` SignalR broadcasts.
- Completed session persistence and daily counts.
- Todo/Kanban task linking.
- Stopwatch laps.

## Risk Lane

High-risk because the story introduces a new bounded context, database schema,
public API endpoints, and Redis-backed server state.

## Product Sources

- `SPEC1.md` Feature 9.
- `docs/product/pomodoro.md`.
