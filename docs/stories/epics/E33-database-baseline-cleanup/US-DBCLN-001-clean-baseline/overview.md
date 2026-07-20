# US-DBCLN-001 Clean Baseline

## Goal

Create a single current PostgreSQL baseline for the empty local FluentA
database and retire storage left behind by completed Flashcard and asset
workflow migrations without changing shipped user behavior.

## Acceptance Criteria

1. Flashcard and Practice continue to list vocabulary pages as Page Decks and
   read their words from vocabulary storage.
2. Vocabulary create/update/delete no longer creates or mutates persisted
   Flashcard deck/card projections.
3. The legacy asset deletion queue and its recurring worker job are absent.
4. Review answer persistence, recap, summaries, and dashboard remain functional
   using the reduced Review history record.
5. One `InitialBaseline` migration creates the full current schema on the empty
   local database.
6. Live schema inspection proves the approved tables/columns are absent and
   all retained constraints are present.
7. Product and architecture documents describe vocabulary-owned Page Decks and
   the reduced Review history contract.

## Verification

- Domain and Application unit tests.
- API and Worker builds/tests.
- EF migration script generation, database update, and pending-model check.
- Read-only live PostgreSQL schema and EF history queries.
- Focused Flashcard, Practice, Vocabulary, and Review browser/API proof where
  the existing harness can observe the unchanged workflow.
- `git diff --check` and final dirty-file isolation check.
