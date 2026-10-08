# Vocabulary Backend Behavior

## Ownership

Every read, update, and delete checks ownership through the hierarchy:

```text
authenticated user -> board -> page -> word
```

A page or word outside that hierarchy is returned as not found, so the API does
not disclose another user's resources.

## API

Vocabulary routes live under `/api/v1/vocabs`. Board and page/word creation
returns `201`; reads and updates return `200`. Expected validation and not-found
failures use `OperationResult<T>` and are mapped by the API to the shared
`ApiResponse<T>` body and matching HTTP status. Database and infrastructure
failures remain exceptions and are handled by the API exception middleware.

## Deletion and retained history

`DELETE /boards/{boardId}`, `DELETE /pages/{pageId}`, and `DELETE /words/{wordId}`
return `{ deleted: true }` after setting `deleted_at` and `updated_at`.
Ownership and active parent checks still apply. Board/Page deletion also hides
active descendant pages/words. All rows stay in the database.

Related Practice/Review sessions, items, attempts, histories and Review states
are hidden and retained. A Word deletion hides sessions containing that Word;
a Page/Board deletion also hides sessions for its pages. Existing aggregate
Practice summaries for affected pages are hidden. Unrelated sessions and the
Review schedules of surviving words remain available.

The service owns one `SaveChangesAsync` commit for Vocabulary and history
changes. No Trash, restore, Undo or cleanup job remains. See [Deletion](deletion.md).

## Page Drafts And Column Preferences

For example, an unfinished new row on page A stays on A when the user opens
page B. Returning to A restores it. Add and row-edit drafts belong to their
page and live only in the current app's memory. Refreshing or closing the app
discards unsaved drafts. Saved-data snapshots in sessionStorage are separate
from drafts. Account-session cache clearing also clears drafts.

Save requests capture their original page or board id. A delayed response after
switching pages updates the originating cache and draft. A pending row is
disabled until its save settles, including after leaving and returning to it.

For example, hiding Context and dragging Word still sends eight column keys.
Reordering changes visible keys while retaining hidden keys in the full order.
Reenabling an optional column places it after the other visible columns. Resize
and reorder failures show an error and restore the most recently confirmed
configuration. Concurrent local preference saves are disabled until completion.

Practice enrollment and recovery are documented in [Practice](practice.md).
