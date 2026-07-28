# E35 Unified Trash And Restore Context

## Initiative Boundary

Add one authenticated Trash capability for product records that FluentA
currently soft-deletes. The capability covers Todo, Notes, Vocabulary,
Vocabulary Level 5 review state, Journal, Countdown, Habit, and Kanban.

The initiative changes the meaning of existing feature Delete actions: outside
Trash they become reversible moves into `/trash`; only Trash can permanently
delete product data. Pomodoro, Notifications, Auth/account deletion, Avatar
replacement, and unattached asset cleanup are not part of this initiative.

## Existing Behavior

- Product entities inherit `DeletedAt` from `BaseEntity`; repositories normally
  hide rows where `DeletedAt` is set.
- Existing feature `DELETE` endpoints soft-delete records but expose no list,
  restore, bulk action, or manual permanent-delete contract.
- The weekly `database-cleanup` Hangfire job directly hard-deletes a partial
  set of soft-deleted tables after 30 days. It does not provide one coherent
  lifecycle for all E35 domains.
- Note delete removes `note_page_assets` links and archives ready images.
- Countdown delete detaches its cover and archives the asset; completed
  Countdowns auto-retire after seven days.
- Level 5 Remove deactivates `word_review_states` and therefore excludes the
  word from Review while retaining the Vocabulary word and review history.
- `/trash`, a Trash API, Trash navigation, and permanent-delete confirmation do
  not exist.

Current product contracts:

- `docs/product/personal-productivity.md`
- `docs/product/notes.md`
- `docs/product/vocabulary-board.md`
- `docs/product/learning-workflows.md`
- `docs/product/journal.md`
- `docs/product/kanban.md`
- `docs/product/assets.md`
- `docs/product/notifications.md`

## Locked Decisions

### D1 - Two-stage deletion

An existing feature Delete moves the owned record into Trash. Only Delete from
Trash permanently deletes it.

### D2 - Restore destination

Restore returns the record to its original parent, position, date, and product
context, subject to the explicit reminder and Level 5 exceptions below.

### D3 - Hierarchy is one Trash unit

Deleting a parent board moves its active descendants as one Trash unit. Restore
returns the whole unit; permanent delete removes the whole unit. This applies
to Notes, Vocabulary, and Kanban hierarchies.

### D4 - One protected Trash route

Use one authenticated `/trash` route rather than per-feature Trash pages.

### D5 - Level 5 restore resets learning level

Removing a Level 5 word moves its Review membership into Trash and excludes it
from Review while leaving the Vocabulary word in its Board/Page. Restore
reactivates the word at the beginning of the SRS progression (`Level = 0`), not
at Level 5.

### D6 - Level 5 permanent-delete boundary

Permanently deleting a Level 5 Trash item removes its Review state and Review
history only. It does not delete the source Vocabulary word.

### D7 - Initial module scope

The coordinated E35 release covers Todo, Notes, Vocabulary, Level 5, Journal,
Countdown, Habit, and Kanban.

### D8 - Thirty-day retention with manual purge

Every Trash item receives a 30-day retention deadline. The system permanently
deletes it after the deadline, and the user may permanently delete it earlier.

### D9 - Attached media remains restorable

Note images and Countdown covers remain associated and retained while their
owner is in Trash. Restore returns the content with its media. Permanent delete
removes the business relationship and makes the owned objects due for physical
purge.

### D10 - Reminders and alerts do not restore

Deleting Todo, Habit, or Countdown data cancels and removes its reminder/alert
configuration. Restore returns the content without schedules; the user must
configure new schedules.

### D11 - Existing feature copy remains Delete

Feature surfaces continue to label the action Delete even though it moves the
record to Trash. Permanent deletion is available only in `/trash`. The current
Level 5 `Remove selected` learning-language action may remain Remove while
using the same Trash lifecycle.

### D12 - Confirmation boundary

Moving a record to Trash does not open a confirmation dialog and instead shows
an Undo action. Permanent delete, bulk permanent delete, and Empty Trash always
require an irreversible-action confirmation.

### D13 - Individual and bulk Trash actions

Trash supports individual Restore/Delete, multi-select Restore/Delete, and
Empty Trash. Destructive confirmations show the number of selected root items
and disclose that descendants are included.

### D14 - Superseded legacy-backfill direction

The earlier exploration choice to backfill soft-deleted development records
was superseded by D21 after current media-detachment behavior was inspected.

### D15 - Restored expired Countdown behavior

A Countdown already more than seven days past its target restores at the
original date as Completed. It remains visible for seven days from Restore and
then automatically returns to Trash.

### D16 - Repeating Todo deletion scope

Deleting one repeating Todo occurrence moves the selected occurrence and any
already-created future occurrences in the same chain to Trash. Past
occurrences remain unchanged. Restore returns the moved chain.

### D17 - Unified list presentation

`/trash` uses one list, not per-module sections or cards. Each row shows name,
module type, original location, deleted time, and time remaining. The page
supports search and module filtering and defaults to newest-deleted first.

### D18 - No expiry notification

Do not create a Notification before automatic purge. Trash shows time
remaining on the row.

### D19 - Sidebar placement

Trash is a persistent AppShell sidebar item near Notifications and Settings.

### D20 - Level 5 review resumes tomorrow

Restoring a Level 5 Trash item sets `Level = 0` and makes it due on the user's
next local calendar day, not immediately.

### D21 - No legacy deleted-data backfill

FluentA is still in development. E35 does not import historical soft-deleted
rows into Trash. The cutover may permanently remove or ignore those deleted
rows. Active records remain in place and enter the new lifecycle only when
deleted after E35 is active.

## Explicit Exclusions

- Restoring reminder or alert configuration.
- Backfilling any pre-E35 soft-deleted record or detached legacy media.
- Account deletion, auth challenge cleanup, Notification deletion, Pomodoro
  data, avatar replacement, or pending/unattached asset cleanup.
- Per-module Trash routes.
- Email or in-app warning before automatic purge.
- Releasing only a subset of the eight approved product domains.

## Deferred Technical Questions For Validation

- Whether a central registry plus feature-owned handlers can keep list metadata
  and domain rows atomic under restore, manual purge, and scheduled purge.
- The exact transaction and claim protocol that prevents Restore racing a
  purge worker or a manual bulk delete.
- How attached archived assets remain recoverable without being downloadable
  through deleted Note/Countdown ownership paths.
- How Todo recurrence links identify the selected and already-created future
  chain without touching past occurrences.
- Which current foreign keys cascade safely during hard delete and which need
  explicit dependency ordering.
- How development-only deleted rows are removed without changing active data.
- Server-side pagination and bounded bulk limits for a unified Trash list.

## Exploration Gate

The user approved D1-D20, then superseded D14 with D21 after the legacy-media
conflict was explained. Planning may proceed. Source implementation, schema
changes, and API changes still require approval of the E35 work shape and
successful high-risk validation.
