# US-KANBAN-001 Kanban Board Foundation

## Current Behavior

FluentA has Todo, Countdown, Habit, Dashboard, and Journal productivity
surfaces. It does not yet have a Project Management Kanban Board, Kanban API, or
Kanban persistence model.

## Target Behavior

A logged-in user can open `/kanban`, create boards with default columns, manage
owned columns, create and edit cards, move cards across columns or within a
column, and filter the loaded board client-side by title, tag, priority, and
deadline state.

## Affected Users

- Authenticated learner using FluentA as a personal productivity workspace.

## Affected Product Docs

- `docs/product/kanban.md`
- `SPEC1.md` Feature 8

## Non-Goals

- SignalR `KanbanCardMoved` cross-tab synchronization.
- Pomodoro linking.
- Rich-text card description editor.
- Dashboard Kanban widget.
