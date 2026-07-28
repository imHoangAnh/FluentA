# US-TRASH-001 Unified Trash And Todo Foundation

## Current Behavior

Todo `DELETE /api/v1/todos/{id}` sets `DeletedAt`, hides the item from normal
queries, and provides no restore or Trash entry. Todo reminder jobs ignore the
deleted row. The weekly database cleanup later hard-deletes old Todo rows
directly. The frontend confirms Delete and has no Undo or `/trash` route.

## Target Behavior

A Todo Delete keeps the current route but atomically moves the owned Todo root
into the new Trash registry, removes reminder configuration, and returns the UI
to the normal Todo view with an Undo action. `/trash` lists the owned item and
supports restore to the original date/order, confirmed permanent deletion, and
a claim-safe 30-day purge. Repeating Todo deletion moves the selected and
already-created future chain while preserving past occurrences.

The story establishes the production-shaped registry, API, page, sidebar, and
participant boundary needed by later E35 stories, but it does not release a
Todo-only Trash product.

## Affected Users

- Authenticated learner managing owned Todo data.

## Affected Product Docs

- New `docs/product/trash.md`.
- `docs/product/personal-productivity.md`.
- `docs/product/notifications.md` only to confirm no purge warning is added.

## Non-Goals

- Notes, Vocabulary, Level 5, Journal, Countdown, Habit, or Kanban participant
  implementation.
- Legacy soft-deleted data backfill.
- Reminder restoration.
- Public release before US-TRASH-006.
