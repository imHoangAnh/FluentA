# Design

## Application Flow

Start validates an optional linked task through existing owner-scoped Todo or
Kanban repositories. The link stays in Redis across phases and is copied into
completed Work sessions. The active browser calls the existing complete command
at zero and then plays a sound and shows a browser notification.

## UI / Platform Impact

The Pomodoro page provides a task selector before idle start and a client-only
stopwatch with start, pause, reset, and lap controls.
