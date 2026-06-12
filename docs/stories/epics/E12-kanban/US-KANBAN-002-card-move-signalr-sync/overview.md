# US-KANBAN-002 Card Move SignalR Sync

## Current Behavior

US-KANBAN-001 persists card moves durably and refreshes the tab that performed
the mutation. Other authenticated tabs do not receive a Kanban-specific
real-time invalidation event.

## Target Behavior

After a successful owned card move, the backend publishes `KanbanCardMoved` to
the moving user's authenticated SignalR group. Authenticated frontend routes
listen for the event and invalidate Kanban query caches so another open Kanban
tab refetches the moved card into its new column.

## Affected Users

- Authenticated learner with multiple FluentA tabs open.

## Affected Product Docs

- `docs/product/kanban.md`

## Non-Goals

- Broadcasting card create/update/delete events.
- Multi-user collaborative boards.
- SignalR backplane or multi-instance deployment behavior.
- Pomodoro linking.
