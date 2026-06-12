# Design

## Backend

- Add `PomodoroConfig` as a user-owned domain entity.
- Persist configuration in Postgres with a unique `user_id` index.
- Add `IPomodoroRepository` for config reads/writes.
- Add `IPomodoroCurrentStateStore` for Redis-backed current timer state reads.
- Add `PomodoroService` methods:
  - `GetConfigAsync`
  - `UpdateConfigAsync`
  - `GetCurrentAsync`
- Expose:
  - `GET /api/v1/pomodoro/config`
  - `PATCH /api/v1/pomodoro/config`
  - `GET /api/v1/pomodoro/current`

## Current State Shape

`GET /current` returns:

- `state`: `Idle`, `Running`, `Paused`, or `Completed`
- `phase`: `Work`, `ShortBreak`, or `LongBreak`
- `remainingSeconds`
- `durationSeconds`
- `startedAt`
- `pausedAt`
- optional linked task fields, reserved for later stories

For `US-POMO-001`, no mutation creates active Redis state yet. The endpoint
therefore returns an idle `Work` state using the user's configured work
duration when Redis has no current state.

## Frontend

- Add a protected `/pomodoro` route.
- Add API helpers for config/current endpoints.
- Render current state and a configuration form.
- Keep validation feedback simple and server-driven.

## Observability

Use existing request logging. No audit log is introduced.
