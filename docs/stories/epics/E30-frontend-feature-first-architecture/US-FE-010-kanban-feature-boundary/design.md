# Design — US-FE-010

The app router composes `kanbanRoutes` from `@/features/kanban`. The feature
owns the board UI, API/types, and SignalR hook. Pomodoro consumes the public
Kanban API. Existing query keys and backend request shapes remain unchanged.
