# 0025 Kanban Card Move SignalR Sync

Date: 2026-06-12

## Status

Accepted

## Context

US-KANBAN-001 proved durable card moves and owner-scoped Kanban APIs. SPEC1 also
requires `KanbanCardMoved` broadcast sync so another open tab can refresh after
a move. FluentA already has an authenticated `/hubs/sync` hub and per-user
SignalR group pattern for Todo, Habit, and Flashcards.

## Decision

Add `KanbanCardMoved` to the existing authenticated SyncHub rather than creating
a new hub. Publish the event only after `MoveCardAsync` successfully persists an
owned card move. Clients receiving the event invalidate Kanban query caches and
refetch through the existing owner-scoped REST API.

## Alternatives Considered

1. Add a dedicated Kanban hub. Rejected because SyncHub already provides the
   authenticated user-group boundary needed for cache invalidation events.
2. Send full board state in the event. Rejected because a small event plus REST
   refetch keeps authorization and payload shaping centralized in the API.

## Consequences

Positive:

- Reuses the proven SignalR authentication and group model.
- Keeps durable correctness independent from connected clients.
- Gives same-user tabs live Kanban movement refresh.

Tradeoffs:

- Only card moves sync in this story; card create/update/delete still rely on
  local mutation refresh.
- Multi-instance SignalR backplane behavior remains deferred.

## Follow-Up

- Consider card create/update/delete invalidation only after there is concrete
  user pressure.
- Revisit SignalR backplane setup during deployment/platform hardening.
