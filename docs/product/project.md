# Project

## Accepted behavior

The user confirmed this feature's existing scope on 2026-10-08. Project tracks
personal goals and stays separate from Todo.

- Keep the current Project board, column, and card flows.
- Boards start with `To Do`, `In Progress`, and `Done` columns. Users can rename
  and reorder columns, and delete an empty column.
- Cards keep title, optional description, priority, optional target date, and
  ordering. Users can create, edit, move, and delete cards.
- Confirm deletes and use the shared soft-delete behavior in [Deletion](deletion.md).
- Remove Project's SignalR event and subscriber. Local Project mutations
  continue to refresh the page's Project queries.
