# Epic Map: Unified Trash And Restore

Mode: `high_risk_initiative`

## Feature Outcome

FluentA presents one owner-scoped `/trash` list for eight product domains,
supports exact restore and confirmed permanent deletion, retains items for 30
days, coordinates hierarchical and media-owned aggregates safely, and replaces
the current partial direct-cleanup behavior without importing development-only
deleted data.

## Story Queue

| Story | Outcome | Depends on | Exit proof |
| --- | --- | --- | --- |
| US-TRASH-001 | Unified Trash lifecycle is demonstrated end to end with Todo, including sidebar/page, list, Undo restore, permanent delete, retention claim, ownership, and selected-plus-future recurrence | none | proposed decision validated; migration/transaction/concurrency proof; Todo API/unit/UI/browser proof |
| US-TRASH-002 | Note boards/pages and private images move, restore, and permanently purge as hierarchy-safe Trash units | US-TRASH-001 | Note hierarchy tests, live asset relationship/state proof, download denial, MinIO retry proof, browser restore |
| US-TRASH-003 | Vocabulary boards/pages/words and Level 5 Review state obey their distinct Trash and permanent-delete boundaries | US-TRASH-001 | hierarchy/source-of-truth tests, Level 5 next-day Level 0 proof, history-only purge, Flashcard/Practice regression |
| US-TRASH-004 | Countdown and Habit Trash flows remove schedules, preserve approved content/media, and implement restored-expired Countdown behavior | US-TRASH-001, US-TRASH-002 | reminder/alert non-restoration, asset proof, seven-day re-retirement clock, worker tests, browser flows |
| US-TRASH-005 | Journal and Kanban complete the approved module coverage with exact date, hierarchy, and order restoration | US-TRASH-001 | Journal date/content proof, Kanban board/column/card cascade and ordering proof, focused UI/E2E |
| US-TRASH-006 | Unified search/filter, bounded bulk restore/delete, Empty Trash, no-backfill cutover, automatic purge, docs, and coordinated release proof are complete | US-TRASH-002, US-TRASH-003, US-TRASH-004, US-TRASH-005 | active-row-preserving migration, bulk/concurrency/ownership suite, worker purge, responsive E2E, builds, matrix reconciliation |

## Current Story

`US-TRASH-001` - Prove the unified Trash contract through Todo before changing
the other seven domains.

This is the smallest story that can validate the proposed registry and
participant boundary end to end. It must not be treated as permission to ship a
Todo-only public contract; E35 releases after all approved participants and
release proof are complete.

## Release Invariants

- Existing feature DELETE routes remain; permanent deletion is Trash-only.
- Active records are never part of the D21 development-data cleanup.
- Every Trash mutation is owner-scoped and non-disclosing.
- Descendants are represented by one root Trash item when the parent is moved.
- Reminder/alert configuration never returns on Restore.
- Note/Countdown media stays restorable for the full Trash retention window.
- The existing E31 archive/purge state machine is extended, not bypassed by a
  second object-deletion implementation.
- No story is marked release-complete from mocked frontend proof alone.
