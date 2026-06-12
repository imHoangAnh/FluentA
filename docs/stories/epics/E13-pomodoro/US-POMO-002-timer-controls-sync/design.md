# Design

- Redis stores phase, state, duration, remaining-at-start, and `startedAt`.
- Running remaining time is computed as
  `remainingAtStart - (utcNow - startedAt)` and clamped to zero.
- Pausing stores the computed remaining time and clears the running timestamp.
- Resuming stores a fresh `startedAt` with the paused remaining value.
- Reset deletes Redis state.
- Complete starts the next phase immediately: Work to ShortBreak, break to
  Work.
- Every successful mutation persists first, then sends `PomodoroSync`.
- Frontend invalidates `['pomodoro', 'current']` on `PomodoroSync` and performs
  a local one-second display countdown between server refreshes.
