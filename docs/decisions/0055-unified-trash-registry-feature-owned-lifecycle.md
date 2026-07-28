# 0055 Unified Trash Registry With Feature-Owned Lifecycle

Date: 2026-07-28

## Status

Accepted

## Context

FluentA currently expresses deletion independently in each bounded context by
setting `DeletedAt`. Normal queries hide deleted rows, and one weekly job
directly hard-deletes a partial set of tables after 30 days. There is no unified
owner-scoped Trash list, restore operation, manual permanent-delete boundary,
hierarchy grouping, or concurrency claim.

E35 must coordinate eight domains without moving their content or ownership
rules into a generic cross-domain table. It must also extend the private asset
lifecycle established by decision 0049 so Note images and Countdown covers can
be restored during the retention window.

## Decision

Introduce a central `trash_entries` lifecycle registry and unified Trash API.
The registry owns user-visible list metadata, 30-day deadlines, root grouping,
and restore/purge claim state. It does not own domain content.

Each participating bounded context implements a controlled Trash participant
that owns authorization, descendant selection, original-location restore,
schedule removal, and dependency-ordered hard deletion. Registry and domain
state changes use the shared PostgreSQL transaction.

The Trash API dispatches only through a closed entity-kind mapping; it never
accepts a table name, CLR type, or arbitrary handler from the client. Missing,
foreign, restored, and permanently deleted items use non-disclosing behavior.

Attached Note/Countdown assets remain durably associated while the owning
record is in Trash and are unavailable through active-feature download flows.
Restore returns them to the ready owning feature. Permanent delete makes them
immediately due for the retryable E31 object-purge lifecycle.

No `trash_entries` are created for records deleted before the E35 cutover.
Development-only deleted rows may be removed, but active rows and active asset
relationships are preserved.

## Alternatives Considered

1. Union deleted domain tables on every read. Rejected because list snapshots,
   pagination, bulk claims, and retention races would be duplicated.
2. Store serialized copies of deleted aggregates centrally. Rejected because
   it duplicates domain sources of truth and weakens relational restoration.
3. Let the central service hard-delete tables generically. Rejected because
   authorization, descendants, reminders, Review history, and assets are
   feature-owned.
4. Continue the weekly direct `ExecuteDelete` job. Rejected because it bypasses
   the approved Trash contract and covers only part of the requested scope.

## Consequences

Positive:

- One queryable, pageable Trash surface with one retention clock.
- Feature ownership and aggregate rules stay inside their bounded contexts.
- Restore/manual purge/scheduled purge can share one concurrency protocol.
- Existing DELETE routes can remain compatible.

Tradeoffs:

- The registry's polymorphic entity reference cannot use one PostgreSQL FK;
  atomic participant writes and orphan audits become required proof.
- Every new Trash-capable domain must register a handler and completeness test.
- Asset lifecycle needs a reversible retained state and careful purge-race
  handling beyond E31's original no-restore scope.
- The coordinated release is larger than a Todo-only Trash implementation.

## Follow-Up

- Registry constraints, transaction claims, owner-scoped API behavior, and the
  eight participants are evidenced in the E35 story validation pack.
- `docs/product/trash.md` is the cross-module product contract; feature
  contracts remain authoritative for their individual scheduling/media rules.
