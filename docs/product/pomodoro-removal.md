# Pomodoro and realtime removal

Accepted by the user on 2026-10-08 as part of the feature migration.

- Pomodoro has no page, menu, Dashboard widget, API, runtime timer or repository.
- The Dashboard catalog retains Review, Todo, Countdown, Habit and Project.
  Existing layout preferences ignore the removed widget, keep valid order and
  use the current defaults to satisfy the existing minimum of three widgets.
- Removed frontend URLs `/pomodoro` and its descendants use the existing
  unknown-route fallback to Overview. Removed API and SignalR URLs return 404.
- No SignalR connection, hub, subscription or frontend package remains.
  Mutations refresh queries in the current app. Auth refresh and authentication
  coordination keep their existing behavior.
- The new database schema removes `pomodoro_configs` and `pomodoro_sessions`.
  Historical migrations are retained until the final fresh baseline is rebuilt.
  Validate schema changes on a dedicated database; do not migrate the user's
  existing database during feature work.
