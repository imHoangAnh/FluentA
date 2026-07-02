# Overview

## Current Behavior

Review dashboard queries filter active rows with `deleted_at IS NULL`, but the
main review-state owner/date index and review-history session index were full
indexes. There was no owner/reviewed-at index for retention and streak
dashboard checks.

## Target Behavior

Active review dashboard and review-session reads use partial indexes that match
their owner, date, session, and soft-delete predicates.

## Affected Users

- Learners opening Flashcard dashboard and Review summaries.
- Maintainers validating review performance.

## Affected Product Docs

- `docs/product/database-performance.md`
- `docs/product/flashcards.md`
- `docs/product/learning-workflows.md`

## Non-Goals

- Changing the Review API response contract.
- Adding broad indexes for every table in SPEC Section 17.
- Replacing EF Core migrations.
