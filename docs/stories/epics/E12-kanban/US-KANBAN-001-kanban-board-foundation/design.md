# Design

## Domain Model

- `KanbanBoard`: user-owned aggregate root with a name and child columns.
- `KanbanColumn`: board-owned lane with name and sort order.
- `KanbanCard`: column-owned work item with title, optional description,
  priority, optional deadline, sort order, and tags.
- `CardPriority`: `Low`, `Medium`, `High`, `Critical`.

Board creation adds `To Do`, `In Progress`, and `Done` columns. Board deletion
soft-deletes active child columns and cards. Column deletion is blocked when the
column has active cards.

## Application Flow

- Queries list board summaries or load one board detail with all active columns
  and cards.
- Commands validate request DTOs, load owner-scoped entities, mutate domain
  objects, and persist through a repository.
- Card moves validate the target column belongs to the same owned board.

## Interface Contract

The API surface is `/api/v1/kanban`. All routes require authentication and use
the FluentA envelope. Missing, deleted, or foreign-user resources return
`KANBAN_NOT_FOUND` with HTTP 404. Validation failures return
`VALIDATION_ERROR` with HTTP 422. Deleting a column with active cards returns
`KANBAN_COLUMN_NOT_EMPTY` with HTTP 409.

## Data Model

Add `kanban_boards`, `kanban_columns`, and `kanban_cards` tables. Index boards
by `(user_id, deleted_at)`, columns by `(board_id, deleted_at, sort_order)`, and
cards by `(column_id, deleted_at, sort_order)`. Store card tags as a Postgres
text array.

## UI / Platform Impact

Add `/kanban` to the protected app and navigation. The page shows a board list,
active board, horizontal columns, card forms, edit modal/section, move controls,
and client-side filters. The layout remains horizontally scrollable on narrow
screens.

## Observability

Use existing request logging and Harness trace evidence. No new audit log is
introduced for the foundation story.

## Alternatives Considered

1. Add only backend CRUD before UI. Rejected because the user asked to
   implement the Kanban board, and the story needs a user-visible slice.
2. Add SignalR in the first slice. Rejected in decision `0024` to keep durable
   movement proof separate from real-time sync.
