# 0024 Kanban Board Foundation Boundary

Date: 2026-06-12

## Status

Accepted

## Context

SPEC1 Feature 8 defines Kanban boards with custom columns, cards, ordering,
filters, and SignalR movement sync. The feature introduces a new user-owned data
model and public API surface. Implementing all advanced behavior at once would
mix durable CRUD correctness with real-time sync and future Pomodoro linking.

## Decision

Implement the Kanban foundation as an owner-scoped board/column/card CRUD and
ordering slice. The first story persists boards with default columns, supports
column and card mutation, blocks non-empty column deletion, supports card moves,
and provides client-side search/filter UI from the loaded board detail.

SignalR `KanbanCardMoved`, Pomodoro linking, and rich-text card descriptions are
deferred until the core durable behavior is verified.

## Alternatives Considered

1. Implement SignalR movement sync in the foundation story. Rejected because the
   move contract should be proven durably before adding cross-tab cache
   invalidation.
2. Implement board creation only. Rejected because the user asked for the
   Project Management Kanban Board, and a board without cards/moves would not
   satisfy the useful MVP.

## Consequences

Positive:

- The riskiest ownership, schema, and ordering behavior lands behind focused
  tests and one product contract.
- Later Pomodoro and real-time stories can build on a stable card identity and
  move API.

Tradeoffs:

- Cross-tab card movement sync remains a visible follow-up.
- Card descriptions are plain text in the foundation slice.

## Follow-Up

- Add `KanbanCardMoved` SignalR sync after movement proof is stable.
- Add Pomodoro task linking to Todo and Kanban cards in the Pomodoro epic.
