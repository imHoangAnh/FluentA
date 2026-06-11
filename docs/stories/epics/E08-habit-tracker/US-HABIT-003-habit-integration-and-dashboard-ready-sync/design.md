# Design

## Sync Listener

- Add `useHabitSync` under `src/frontend/src/lib/realtime`.
- Reuse the existing authenticated SignalR hub URL and lazy import pattern from
  `useTodoSync`.
- Subscribe to `HabitChecked`.
- Invalidate `['habit']` with `refetchType: 'all'` so list and monthly entry
  queries refresh even when the Habit route is inactive.
- Invalidate `['dashboard']` with `refetchType: 'all'` for future Dashboard
  readiness.

## Mount Point

- Mount `useHabitSync` in `ProtectedRoute`.
- Keep the listener disabled in test mode and when WebSocket is unavailable,
  matching the existing realtime hooks.

## Proof Shape

- Browser proof uses two authenticated tabs for the same learner.
- Tab A opens Habit and toggles today's habit cell.
- Tab B first loads Habit to create caches, moves to Countdown, receives
  `HabitChecked`, refetches Habit data while inactive, then returns to Habit and
  shows the checked state.
