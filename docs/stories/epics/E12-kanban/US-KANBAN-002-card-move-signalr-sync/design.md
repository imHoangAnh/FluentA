# Design

## Domain Model

No domain entity changes. `KanbanCard.MoveToColumn` remains the durable state
change.

## Application Flow

`KanbanService.MoveCardAsync` captures the source column id, validates the
target column is owned by the same authenticated user, persists the move, then
publishes `KanbanCardMoved` through an optional `IKanbanSyncNotifier`.

## Interface Contract

Reuse the existing authenticated `/hubs/sync` hub. Add event:

```json
KanbanCardMoved {
  "boardId": "guid",
  "cardId": "guid",
  "fromColumnId": "guid",
  "toColumnId": "guid",
  "sortOrder": 0
}
```

The event is sent only to `SyncHub.UserGroup(userId)`.

## Data Model

No schema change.

## UI / Platform Impact

Add `useKanbanSync` under `src/frontend/src/lib/realtime` and mount it at
`ProtectedRoute`. On `KanbanCardMoved`, invalidate `['kanban']` queries with
`refetchType: 'all'`.

## Observability

Use existing API request logs and Harness trace. No audit log is introduced.

## Alternatives Considered

1. Poll Kanban board detail in every open tab. Rejected because the app already
   has authenticated SignalR cache invalidation and SPEC1 calls for
   `KanbanCardMoved`.
2. Send a full board payload in the event. Rejected because query invalidation
   keeps the hub payload small and relies on the existing owner-scoped API.
