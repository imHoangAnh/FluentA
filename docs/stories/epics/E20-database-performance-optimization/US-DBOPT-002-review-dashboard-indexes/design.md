# Design

## Domain Model

No domain state transitions change.

## Application Flow

Dashboard and review-summary reads continue through `EfFlashcardRepository`.
The database receives indexes that match those read predicates.

## Interface Contract

No route, DTO, status code, or SignalR contract changes.

## Data Model

Migration `20260702023905_OptimizeReviewDashboardIndexes`:

- Replaces `IX_word_review_states_user_id_next_review_date` with the same key
  and `WHERE deleted_at IS NULL`.
- Replaces `IX_word_review_histories_user_id_session_id` with the same key and
  `WHERE deleted_at IS NULL`.
- Adds `IX_word_review_histories_user_id_reviewed_at_active` on
  `(user_id, reviewed_at) WHERE deleted_at IS NULL`.

The migration uses PostgreSQL `CREATE INDEX CONCURRENTLY` and
`DROP INDEX CONCURRENTLY` through raw migration SQL with transaction
suppression.

## UI / Platform Impact

None.

## Observability

The baseline collector records index definitions, sizes, usage counters, and
representative EXPLAIN plans.

## Alternatives Considered

1. Add duplicate partial indexes while leaving full indexes in place; rejected
   to avoid unnecessary write cost.
2. Keep full indexes; rejected because active-row filters are stable on these
   hot paths.
