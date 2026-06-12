# Pomodoro & Stopwatch

## Product Boundary

This contract covers SPEC1 Feature 9, starting with Pomodoro configuration and
current timer state. Timer controls, completed-session history, task linking,
SignalR `PomodoroSync`, and the client-only stopwatch are implemented in later
Pomodoro stories.

## Outcomes

- A logged-in user can open `/pomodoro` from protected app navigation.
- A logged-in user has a Pomodoro configuration with defaults:
  - work: 25 minutes
  - short break: 5 minutes
  - long break: 15 minutes
  - long break after: 4 completed work sessions
- A logged-in user can update their Pomodoro configuration.
- Configuration is stored per user and survives new sessions.
- A logged-in user can fetch current Pomodoro state from the server.
- When no timer is active, current state returns `Idle` with remaining seconds
  derived from the user's work duration.
- A logged-in user can start, pause, resume, reset, and manually complete the
  current timer.
- Running timer remaining time is derived from server timestamps rather than
  being decremented in Redis.
- Every successful timer mutation broadcasts `PomodoroSync` to the user's
  authenticated SignalR group.
- Completing a Work phase persists one completed session and increments the
  durable completed-work count.
- Every configured Nth completed Work phase starts a LongBreak; other completed
  Work phases start a ShortBreak.
- A logged-in user can fetch their completed Work count for their local day.
- Before starting Work, a user can optionally link an owned active Todo or
  Kanban card; completed Work sessions preserve that link.
- The visible active browser automatically completes a phase at zero and
  provides a browser sound/notification alert.
- A client-only stopwatch supports start, pause, reset, and transient laps.

## API Contract

All responses use the FluentA envelope.

| Method | Endpoint | Behavior |
| --- | --- | --- |
| `GET` | `/api/v1/pomodoro/config` | Get or create the authenticated user's Pomodoro configuration. |
| `PATCH` | `/api/v1/pomodoro/config` | Update supplied configuration fields. |
| `GET` | `/api/v1/pomodoro/current` | Return the authenticated user's current timer state from Redis, or idle defaults when no active state exists. |
| `POST` | `/api/v1/pomodoro/start` | Start an idle Work timer using current config and an optional owned task link. |
| `POST` | `/api/v1/pomodoro/pause` | Pause a running timer and persist remaining seconds. |
| `POST` | `/api/v1/pomodoro/resume` | Resume a paused timer. |
| `POST` | `/api/v1/pomodoro/reset` | Clear current state and return idle Work state. |
| `POST` | `/api/v1/pomodoro/complete` | Manually complete the phase and start the next phase. |
| `GET` | `/api/v1/pomodoro/today?utcOffsetMinutes=N` | Return the authenticated user's completed Work count for the client-local day. |

## Validation And Error Rules

- `workMinutes`, `shortBreakMinutes`, and `longBreakMinutes` must be between
  1 and 60.
- `longBreakAfter` must be between 1 and 12.
- Validation failures return `422 VALIDATION_ERROR`.
- Missing authentication returns the shared auth `401` response.
- Current timer state is user-scoped by authenticated user id.
- Invalid state transitions return `409 POMODORO_INVALID_STATE`.

## Timer Transition Rules

- `Start`: `Idle -> Running Work`.
- `Pause`: `Running -> Paused` and freezes computed remaining seconds.
- `Resume`: `Paused -> Running` from the frozen remaining seconds.
- `Reset`: any state -> `Idle Work`.
- `Complete`: `Work -> persisted completed session -> Running ShortBreak` or
  `Running LongBreak` at the configured interval; any break -> `Running Work`.

## Real-Time Rules

- Successful timer mutations publish `PomodoroSync` after Redis persistence.
- Every authenticated route listens for `PomodoroSync` and invalidates current
  Pomodoro state queries.

## Deferred Integration

- Server background scheduling and persisted stopwatch laps remain deferred.
