# Design — US-FE-013

The router composes `pomodoroRoutes`. Pomodoro owns its page, API, and sync
hook, while consuming Todo and Kanban only through their public feature APIs.
