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

`DELETE /boards/{boardId}`, `DELETE /pages/{pageId}`, and
`DELETE /words/{wordId}` move the resource to Trash and return its Trash entry.
Permanent deletion is performed through the Trash API.

## Trash And Review Scheduling

Vocabulary is soft-deleted for the Trash retention period (30 days). Soft delete
does not change a word's review state or due date. Review queries only include
active Vocabulary, so a trashed word is not due or scheduled while it is in
Trash. Restore leaves its saved due date unchanged: a date on or before today
is due on the next Review query; a future date stays scheduled for that date.

Trash owns the transaction for moving, restoring, and permanently deleting
Vocabulary. A successful `OperationResult` commits; an expected failure rolls
back; an exception rolls back and propagates. Repository methods stage
Vocabulary mutations and do not commit normal CRUD operations themselves.

Restoring a board or page restores only descendants whose `DeletedAt` matches
that Trash entry's timestamp. A child moved to Trash separately keeps its own
Trash entry and is not accidentally restored with its former parent.

## Permanent Deletion And Learning History

Permanent deletion physically removes the selected Vocabulary row and its
descendant words/pages, board preferences, and child Trash entries. It also
removes the words' active Review state and abandons any in-progress Review or
Practice session that includes those words.

Completed learning history and achievement records remain:

- Review session items retain word/meaning snapshots, result, completion time,
  and their Review attempts.
- `WordReviewHistory` remains a statistics ledger and can point to its Review
  session item. The original Word id is a historical identifier, not a
  cascading foreign key.
- Practice session items and attempts retain their snapshots and answers.
- Practice sessions and summaries retain their page/board identifiers as
  historical identifiers and store the names needed to display old results.

The database migration backfills page names and links existing Review history
to its saved session item before dropping Vocabulary foreign keys. It stops
with a diagnostic if required snapshots, completed results/times, answer
attempts, or historical links are missing; it does not fabricate those values.

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
