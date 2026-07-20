# 0052 Local Database Baseline And Legacy Storage Retirement

Date: 2026-07-21

## Status

Accepted for `US-DBCLN-001` after explicit user approval.

## Context

The local `fluenta_dev` database has no application tables and no applied EF
migrations, while the repository contains 47 historical migrations accumulated
across several replaced workflows. Flashcard and Practice now read vocabulary
pages and words directly, but Vocabulary still maintains duplicate
`flashcard_decks` and `flashcard_cards` projections. The completed private-asset
cutover also leaves a migration-only deletion queue and consumer job in fresh
runtime code.

Review history remains active, but three SRS snapshot columns are written and
never read; current scheduling ownership lives in `word_review_states`.

## Decision

1. Replace the historical EF migrations with one baseline representing the
   approved current local schema.
2. Remove the obsolete Flashcard projection tables and synchronization code.
3. Remove the legacy asset deletion queue and its recurring consumer.
4. Preserve `word_review_histories`, but remove `level_before`, `level_after`,
   and `next_review_date` from that historical record.
5. Preserve current user-facing routes and behavior. Vocabulary pages remain
   the Page Deck identity for Flashcard and Practice.

## Compatibility Boundary

This decision is intentionally destructive to migration-history compatibility
and applies only to the confirmed-empty local database selected by the user. It
does not define an upgrade path for a staging or production database that has
applied any superseded migration.

## Consequences

- Fresh local setup creates only the current schema instead of creating,
  moving, mutating, and dropping historical structures.
- Vocabulary CRUD no longer pays the consistency cost of duplicate Flashcard
  content storage.
- Review keeps the history required by recap/dashboard while
  `word_review_states` remains the single scheduling source of truth.
- Any future deployed database must use a separate forward-migration plan; the
  new baseline must not be advertised as a safe in-place upgrade.

## Alternatives Rejected

- Keep the old chain and add a forward cleanup migration: unnecessary for the
  selected empty local target and contrary to the approved clean-baseline goal.
- Keep lightweight Flashcard projections: retains duplicate ownership without
  a current reader.
- Drop Review history entirely: breaks current session summary and dashboard
  queries.
