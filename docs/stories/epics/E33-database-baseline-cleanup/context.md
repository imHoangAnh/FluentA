# E33 Database Baseline Cleanup Context

## Status

Implemented and reviewed on 2026-07-21. Source implementation, the clean EF
baseline, live PostgreSQL application, API workflow smoke, and cleanup proof
are recorded in `US-DBCLN-001-clean-baseline/validation.md`.

## Intake

- Harness intake: `98`.
- Type: high-risk destructive database maintenance.
- Target: local PostgreSQL database `fluenta_dev` only.
- Current database state: zero application tables and zero applied EF
  migrations; all 47 historical migrations are pending.
- Unrelated worktree change: `src/frontend/src/features/todo/pages/TodoPage.tsx`
  must remain untouched.

## Approved Decisions

- **D1 - Clean local baseline.** Replace the historical EF migration chain with
  one current baseline migration. Compatibility with an already-migrated
  staging or production database is explicitly out of scope.
- **D2 - Retire flashcard projections.** Remove `flashcard_decks` and
  `flashcard_cards` plus their entities, mappings, and persistence sync port.
  Flashcard and Practice continue to present vocabulary pages as Page Decks and
  read live content from `vocab_pages` and `vocab_words`.
- **D3 - Retire the legacy asset queue.** Remove
  `legacy_asset_deletion_queue`, its recurring job, and its runtime persistence
  code. The queue has no runtime producer and exists only for the completed
  legacy asset migration.
- **D4 - Minimize review history.** Keep `word_review_histories` because Review
  actively uses it for persistence, recap, session summaries, and dashboard
  statistics. Remove the write-only `level_before`, `level_after`, and
  `next_review_date` columns.

## Preserved Contracts

- Existing HTTP routes, JSON DTOs, Flashcard/Practice UI terminology, Review
  SRS scheduling, and visible behavior do not change.
- `word_review_states` remains the only SRS scheduling state.
- Review history continues to store owner, word, session, result, duration, and
  reviewed timestamp.
- Existing SignalR Flashcard invalidation remains compatible, but no longer
  queries a persisted deck id; the vocabulary page id is sufficient for the
  current page-owned workflow.
- All other modeled tables remain because each has a current runtime reader,
  writer, API, or background job.

## Out Of Scope

- Forward migration of a database that already applied the old migration
  chain.
- Deleting current Review, Practice, productivity, asset, or settings tables.
- Changing SRS intervals, answer rules, routes, or frontend presentation.
- Cleaning the unrelated Todo worktree change.
