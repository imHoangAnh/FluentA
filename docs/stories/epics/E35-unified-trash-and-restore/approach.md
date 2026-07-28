# Approach: Unified Trash And Restore

## Recommended Work Shape

Mode: `high_risk_initiative`

Deliver one E35 capability through six dependency-ordered vertical stories.
The external product release is coordinated after all eight approved domains
use the same Trash contract; internal stories remain independently reviewable
and demonstrable.

## Recommended Architecture

Create a small `Trash` bounded context that owns only lifecycle coordination
and the unified list. Add a durable `trash_entries` registry with controlled
entity kinds, owner id, entity id, root/group identity, display snapshot,
original-location label, deletion time, purge deadline, and claim/concurrency
state.

The registry is not the source of truth for Todo, Note, Vocabulary, Review,
Journal, Countdown, Habit, or Kanban content. Feature-owned participants remain
responsible for:

- resolving ownership without disclosing foreign records
- marking the correct root and descendants deleted
- restoring original relationships and positions
- clearing non-restorable reminders/alerts
- hard-deleting feature-owned dependencies in a safe order
- retaining, restoring, or purging attached assets

Existing feature `DELETE` endpoints keep their routes and response semantics.
They create the feature mutation and its Trash entry in one database
transaction. New owner-scoped Trash endpoints provide list, restore, permanent
delete, bulk actions, and Empty Trash. Undo uses the new restore command keyed
by controlled entity kind and entity id, so existing DELETE responses do not
need a breaking payload change.

## Proposed Interface Shape

Planning baseline, subject to validation and approval:

- `GET /api/v1/trash?type=&query=&cursor=&limit=`
- `POST /api/v1/trash/restore` with one controlled type/id pair
- `DELETE /api/v1/trash/{trashEntryId}` for one permanent delete
- `POST /api/v1/trash/bulk-restore` with bounded entry ids
- `POST /api/v1/trash/bulk-delete` with bounded entry ids
- `DELETE /api/v1/trash` for confirmed Empty Trash

All reads and mutations are authenticated, owner-scoped, and return the same
non-disclosing `404` behavior used by existing feature APIs. Bulk commands are
bounded, deduplicated, and return per-entry outcomes only when partial success
is an approved, testable contract; validation must choose atomic-all versus
bounded partial processing before implementation.

## Retention And Concurrency

- New Trash entries set `purge_after_at = trashed_at + 30 days`.
- The existing weekly direct table cleanup must be retired or narrowed so it
  cannot bypass Trash coordination.
- A recurring Trash purge job claims due root entries in bounded batches.
- Restore, manual delete, and scheduled purge use a conditional state/version
  transition so only one can win.
- A successful restore removes the active Trash entry and clears `DeletedAt`
  for the root/descendants owned by that feature participant.
- Permanent delete removes the feature aggregate and Trash entry atomically in
  PostgreSQL. External object deletion remains retryable and idempotent; the
  product record is no longer restorable once permanent deletion wins.

## Asset Integration

Extend decision 0049 rather than creating a second storage lifecycle. While a
Note or Countdown is in Trash, its feature relationship remains durable and
its asset is non-downloadable through the active-feature read path. Validation
must choose and prove either a reversible archived asset state or an equivalent
retained state that cannot be read outside Trash.

Restore makes retained assets available again with the owning feature.
Permanent deletion makes them due for immediate asynchronous object purge.
Provider failures must retry without resurrecting the feature record or
reporting the Trash item as restorable.

## No-Legacy-Backfill Cutover

Do not synthesize `trash_entries` for rows deleted before E35. The migration or
release preparation may hard-delete those development-only rows, but must prove
that rows with `DeletedAt IS NULL` and their relationships are unchanged.
Existing active Note images and Countdown covers are preserved.

## Recommended Story Sequence

1. Prove the registry, feature-participant boundary, `/trash` route, ownership,
   retention claim, and Undo end to end with Todo, including repeating-chain
   behavior.
2. Add Notes with hierarchy-aware restore and reversible private-image
   lifecycle.
3. Add Vocabulary board/page/word hierarchy plus Level 5 Review-state reset and
   history-only permanent deletion.
4. Add Countdown and Habit, remove schedules on Trash, preserve Countdown
   media, and prove the restored-expired seven-day rule.
5. Add Journal and Kanban, including Kanban hierarchy and exact location/order
   restoration.
6. Finish unified search/filter, bounded bulk actions, Empty Trash,
   no-backfill cutover, automatic purge, docs, and coordinated release proof.

## Risk Map

| Risk | Why | Proof required |
| --- | --- | --- |
| Restore/purge race | Manual restore, manual delete, and Hangfire may target one root | live PostgreSQL conditional-claim and concurrency tests |
| Cross-domain ownership | A generic Trash API could become an IDOR path | owner/foreign/missing tests for every participant and bulk mix |
| Registry drift | Generic type/id cannot have one FK to eight table families | atomic transaction tests, controlled enum/handler completeness, orphan audit |
| Hierarchy loss | Parent deletion spans pages/words/columns/cards | exact descendant counts, restore placement, cascade hard-delete proof |
| Media loss or leak | E31 currently archives and detaches media on feature delete | live Note/Countdown restore, archived-download denial, retryable purge proof |
| Reminder resurrection | Current rows retain schedule fields in several domains | storage/API assertions that restore has no reminder or alert |
| Review corruption | Level 5 removal and Vocabulary deletion share word identity | state/history/source-word boundary tests and next-local-day proof |
| Legacy data loss | D21 permits deleted-row disposal but not active-row loss | before/after row counts partitioned by `DeletedAt`, active relationship smoke |
| Bulk partial failure | Mixed domains can fail at different dependency boundaries | bounded batch, atomicity decision, deterministic per-item proof |
| Existing cleanup bypass | Weekly cleanup directly deletes tables | job-registration and stale-cleanup scans plus runtime job proof |

## Rejected Alternatives

1. Query eight deleted table families and union them for every Trash request.
   Rejected because list metadata, pagination, bulk claims, and lifecycle races
   would be duplicated and difficult to reconcile.
2. Move full serialized domain records into one Trash table. Rejected because
   it would duplicate product sources of truth and make exact relationship
   restoration brittle.
3. Let Trash hard-delete domain tables generically by table name. Rejected
   because ownership, descendants, reminders, Review history, and assets remain
   feature-owned rules.
4. Keep the existing weekly direct `ExecuteDelete` cleanup as the purge engine.
   Rejected because it bypasses user-visible Trash entries and omits approved
   domains.
5. Backfill current soft-deleted development data. Rejected by D21.
6. Release one feature at a time. Rejected by D7 because Delete semantics would
   be inconsistent across the approved initial product surface.

## Expected Integration Boundaries

- Domain/Application: new Trash registry and feature participant contracts;
  existing Todo, Note, Vocabulary, Review, Countdown, Habit, Journal, Kanban.
- Infrastructure: `AppDbContext`, EF configurations/migration, repositories,
  scheduled jobs, asset storage lifecycle.
- API: new `TrashController`; existing feature DELETE endpoints retained.
- Frontend: new `features/trash`, router registration, AppShell sidebar, Undo
  toasts, existing feature mutation invalidation.
- Proof: domain/application tests, live PostgreSQL concurrency and migration,
  MinIO asset smoke, Vitest, Playwright at desktop/tablet/narrow viewports,
  worker/job registration, stale direct-delete scan.

## Product Docs And Decisions To Update

- Add `docs/product/trash.md`.
- Update all eight affected product contracts listed in `context.md`.
- Update `docs/ARCHITECTURE.md` with Trash coordination ownership.
- Add decision `0055-unified-trash-registry-feature-owned-lifecycle.md`.
- Amend or supersede the relevant future-work consequence in decision 0049;
  do not rewrite E31 history.

## Stop Conditions

Stop before source implementation if validation cannot prove:

- atomic registry/domain writes with the current shared `AppDbContext`
- a claim protocol where Restore and permanent purge cannot both succeed
- exact hierarchy restore without orphaning active descendants
- media retention without download leakage or premature E31 purge
- Level 5 Review history deletion without deleting the Vocabulary word
- a no-backfill migration that demonstrably preserves all active rows
