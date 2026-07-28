# Unified Trash

Authenticated users have one `/trash` workspace for Todo, Notes, Vocabulary,
Level 5 review items, Journal, Countdown, Habit, and Kanban.

Normal **Delete** moves the selected item into Trash immediately and exposes an
Undo action. An item is permanently deleted only from `/trash`, where the user
must confirm the destructive action. Trash retains items for 30 days and the
scheduled purge applies the same permanent-delete path.

The Trash list is owner-scoped, newest-first, searchable, filterable by module,
and supports individual actions, bulk Restore, bulk permanent Delete, and
confirmed Empty Trash. Restore returns the item to its stored position and
ordering context; it never re-enables Todo, Habit, or Countdown reminders.

## Parent-owned content

Deleting a Note board, Vocabulary board/page, or Kanban board moves the parent
and its active descendants as one Trash unit. Restoring that unit restores its
previous hierarchy and stored sort orders. A normal list only shows active
content, so trashed descendants cannot appear before their parent is restored.

## Special lifecycle rules

- Restoring a Level 5 word keeps the source word but recreates learning state
  at level 0 on the next local calendar day. Permanent deletion removes only
  that word's review state and review history.
- A restored completed Countdown that was already more than seven days old
  remains visible for seven days after restoration, then automatically moves
  back to Trash. Its alerts are never restored.
- Note images and Countdown covers remain usable while their owner is in Trash.
  Permanent deletion makes their asset records eligible for the ordinary asset
  purge lifecycle.

Pre-E35 soft-deleted data is intentionally not backfilled into `trash_entries`.
This is an unreleased development migration and only deletes occurring through
the current feature are guaranteed to appear in Trash.
