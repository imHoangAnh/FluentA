# Kanban Board

## Product Boundary

This contract covers the Project Management Kanban Board from SPEC1 Feature 8.
It defines authenticated personal boards, customizable columns, cards, ordering,
and client-side filtering. Pomodoro task linking, scheduled reminders, and
Dashboard aggregation are separate future stories.

## Outcomes

- A logged-in user can open `/kanban` from protected app navigation.
- A logged-in user can create multiple Kanban boards.
- Creating a board automatically creates three columns: `To Do`, `In Progress`,
  and `Done`.
- A logged-in user can see, edit, and delete only their own Kanban boards.
- A logged-in user can add, rename, reorder, and delete columns on an owned
  board.
- Deleting a column is allowed only when the column has no active cards.
- A logged-in user can add, edit, move, reorder, and delete cards on an owned
  board.
- Cards support a required title, optional description, priority, and deadline.
- The board UI displays priority badges and overdue deadline state.
- Board filters are client-side after a board detail request loads all active
  columns and cards.

## Ownership And Authorization Rules

- Every Kanban board belongs to exactly one authenticated user.
- Every Kanban column belongs to exactly one Kanban board.
- Every Kanban card belongs to exactly one Kanban column.
- API calls for missing, deleted, or foreign-user boards, columns, and cards
  return `404` so another user's data is not revealed.
- Deleted boards, columns, and cards are hidden from normal endpoints.
- Deleting a board soft-deletes its active columns and cards.
- Deleting a non-empty column returns `409 KANBAN_COLUMN_NOT_EMPTY`.

## API Contract

All responses use the FluentA envelope.

| Method | Endpoint | Behavior |
| --- | --- | --- |
| `GET` | `/api/v1/kanban/boards` | List active board summaries for the authenticated user. |
| `POST` | `/api/v1/kanban/boards` | Create a board with default columns. |
| `DELETE` | `/api/v1/kanban/boards/{boardId}` | Soft-delete an owned board and its active children. |
| `GET` | `/api/v1/kanban/boards/{boardId}` | Return an owned board with all active columns and cards. |
| `POST` | `/api/v1/kanban/boards/{boardId}/columns` | Add a column to an owned board. |
| `PATCH` | `/api/v1/kanban/boards/{boardId}/columns/{columnId}` | Rename and/or reorder an owned column. |
| `DELETE` | `/api/v1/kanban/boards/{boardId}/columns/{columnId}` | Delete an empty owned column. |
| `POST` | `/api/v1/kanban/boards/{boardId}/cards` | Create a card in an owned column. |
| `PATCH` | `/api/v1/kanban/cards/{cardId}` | Update card fields. |
| `PATCH` | `/api/v1/kanban/cards/{cardId}/move` | Move a card to another owned column and sort position. |
| `DELETE` | `/api/v1/kanban/cards/{cardId}` | Soft-delete an owned card. |

## Validation And Error Rules

- Board and column names are required and must be at most 180 characters after
  trimming.
- Card title is required and must be at most 240 characters after trimming.
- Card description is optional and must be at most 4000 characters after
  trimming.
- Card priority must be `Low`, `Medium`, `High`, or `Critical`.
- Card deadline, when supplied, must parse as a date in `YYYY-MM-DD` format.
- Sort order values must be zero or greater.
- Validation failures return `422 VALIDATION_ERROR`.
- Missing ownership returns `404 KANBAN_NOT_FOUND`.
- Non-empty column deletion returns `409 KANBAN_COLUMN_NOT_EMPTY`.

## UI Rules

- The board list and active board detail are visible on `/kanban`.
- `/kanban` uses a route-local full-width AppShell surface with compact gutters;
  it does not inherit the shared desktop content cap. The document does not gain
  horizontal overflow from the wider board.
- Project tabs and the existing new-project input form the top orientation row.
  The visible workspace heading below them is the selected project name.
- Project deletion is not an always-visible toolbar action. Right-clicking a
  project tab, or using its keyboard context-menu command, moves that exact
  project to Trash and exposes the shared Undo toast. Permanent deletion remains
  owned by Trash.
- Add column is the supported primary action beside the selected project
  heading. It reveals a lightweight required-name input in that row and
  continues to use the existing create-column operation.
- Priority and Deadline form a separate client-side filter row immediately
  above the board. Search, Assignee, Clear filters, Star, Info, and placeholder
  overflow actions are not rendered because they are not current Kanban
  capabilities.
- The active board renders columns horizontally on desktop and remains
  horizontally scrollable within the board on narrow screens. The document
  itself must not gain horizontal overflow from Kanban columns.
- Three columns expand to use the available desktop board width. Additional
  columns preserve a usable minimum width and create local board scrolling.
- Every column shows an icon, editable title, visible card count, delete action,
  an early Add Card action, and a useful empty or no-filter-match state.
- Selecting an existing card or Add Card opens the same non-modal right-side
  detail panel. The panel owns title, description, priority, deadline, save,
  cancel/close, and existing-card deletion; it does not own card movement.
- Card movement can be completed with explicit Move controls in addition to
  pointer drag behavior, so keyboard and narrow-screen users have a reliable
  path.
- Priority and deadline filters are client-side.
- There is no title-search or tag-filter UI in the current contract.
- Board cards show only title, priority, and deadline.
- Card description remains available in create/edit detail only.

## Real-Time Rules

- Successful card moves publish `KanbanCardMoved` to the authenticated user's
  SignalR group after durable persistence succeeds.
- `KanbanCardMoved` payload includes `boardId`, `cardId`, `fromColumnId`,
  `toColumnId`, and `sortOrder`.
- Every authenticated app route listens for `KanbanCardMoved` and invalidates
  cached Kanban board/list queries.
- Durable Kanban correctness does not depend on connected clients or successful
  notification delivery.

## Deferred Integration

- Pomodoro linking to Todo or Kanban cards remains deferred to Pomodoro stories.
- Rich-text card description editing remains plain textarea editing in the
  foundation story.
