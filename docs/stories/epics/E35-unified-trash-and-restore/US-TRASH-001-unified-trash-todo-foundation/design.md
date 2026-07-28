# Design: US-TRASH-001

## Domain Model

Planning candidate `TrashEntry`:

- `Id`
- `UserId`
- controlled `EntityKind`
- `EntityId`
- `RootEntityId` or equivalent group identity
- display-name and original-location snapshots for the unified list
- `TrashedAt`
- `PurgeAfterAt`
- claim/status and concurrency fields proven during validation

Only a root item appears in Trash. A Todo recurrence group stores enough
controlled identity to let the Todo participant select the approved current
and already-created future occurrences; the Trash registry does not traverse
Todo relations itself.

## Application Flow

Delete:

1. Resolve the active Todo and owner through the existing feature boundary.
2. Select the chosen occurrence and already-created future chain.
3. Remove reminder configuration for the moved occurrences.
4. Set feature `DeletedAt` values and create one Trash root entry in the same
   `AppDbContext` transaction.
5. Return the existing DELETE contract; the frontend knows type/id for Undo.

Restore:

1. Resolve and conditionally claim the active owned Trash entry.
2. Ask the Todo participant to restore the root/group to original dates and
   durable order, normalizing order only where current rows now conflict.
3. Do not restore reminders.
4. Remove/close the Trash entry atomically and invalidate Todo/Trash caches.

Permanent delete/purge:

1. Conditionally claim the owned or due Trash root.
2. Ask the Todo participant to hard-delete the approved moved group and owned
   dependencies in FK-safe order.
3. Remove/close the Trash entry in the same transaction.
4. Log counts and outcome without logging Todo content.

## Interface Contract

Candidate endpoints are defined in the epic `approach.md`. The story initially
implements list plus single restore/permanent delete. Requests accept only
controlled kinds and ids. Foreign, missing, already-restored, or already-purged
records do not disclose ownership.

The protected `/trash` route initially renders Todo entries using the final
row contract so later participants add data rather than redesigning the page.
The sidebar link sits near Notifications and Settings.

## Data Model

Validation must refine:

- PostgreSQL enum/check strategy for entity kind and claim status.
- unique active-entry constraint for `(entity_kind, entity_id)`.
- owner/deadline and newest-first indexes.
- root grouping and recurrence metadata without unbounded JSON authority.
- optimistic concurrency or compare-and-swap claim columns.
- migration removal of pre-E35 deleted Todo rows while preserving all active
  rows, recurrence links, and reminder rows belonging to active Todos.

## UI / Platform Impact

- New lazy-loaded `features/trash` route module.
- One persistent Trash sidebar item.
- One list with search/filter contract, even though only Todo is wired in this
  internal story.
- Todo Delete confirmation is removed; success toast offers Undo.
- Permanent delete remains an accessible alert dialog.
- Desktop, tablet, and 320px layouts must not create page-level overflow.

## Observability

- Structured logs for Trash move, restore, manual purge, and scheduled purge
  with user/entity ids and counts, never titles/notes.
- Scheduled job reports claimed, deleted, skipped, and failed counts.
- Orphan-audit query is documented for validation and operational diagnosis.

## Alternatives Considered

1. Todo-specific Trash table: rejected because it cannot become the approved
   unified list without parallel lifecycle systems.
2. Generic reflection/table-name deletion: rejected as unsafe and outside
   feature ownership.
3. Reuse only `DeletedAt`: rejected because it lacks unified list snapshots,
   purge claims, group identity, and bounded bulk coordination.
