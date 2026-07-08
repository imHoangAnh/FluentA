# Design

## Domain Model

- Keep `WordReviewState` as the per-word durable SRS record.
- Add `ReviewSession` with `user_id`, `board_id`, `status`, `order_type`,
  `session_date`, `started_at`, and optional `completed_at`.
- Add `ReviewSessionItem` with `review_session_id`, `vocab_word_id`,
  `is_reviewed`, and `created_at`.
- `ReviewSession.status` uses `active`, `completed`, and `replaced`.

## Application Flow

- `CreateReviewSessionAsync` first checks for an existing owned same-board
  active session.
- If the active session belongs to the same Vietnam-local `session_date`, the
  repository returns enough metadata for the caller to choose continue or
  replace in a later UI slice.
- If the active session belongs to an earlier local day, it is replaced
  automatically and a new queue is created.
- Review queue creation persists both session row and item rows in one durable
  transaction.
- `AddReviewAsync` records answered state against the persisted session item
  before applying SRS mutation and history.

## Interface Contract

- Review session creation/submit routes stay under `/api/v1/review`.
- DTOs need session lifecycle fields beyond the old queue payload.
- This slice may add backend metadata for active-session detection before the
  frontend consumes it fully.

## Data Model

- Add `review_sessions` and `review_session_items`.
- Add indexes for:
  - `review_sessions(user_id, board_id, session_date, status)`
  - `review_session_items(review_session_id, vocab_word_id)` unique
- Preserve `word_review_states` and `word_review_histories` for SRS state and
  audit trail in this slice.
- Migrations must be safe with existing review data and should not require
  backfilling old session rows.

## UI / Platform Impact

- Backend-first slice. Existing frontend may stay temporarily compatible while
  the later review workflow story consumes new session lifecycle behavior.

## Observability

- Session replacement/creation should be traceable through durable state and
  existing request logs.

## Alternatives Considered

1. Reconstruct session state from `word_review_histories`.
   Rejected because the target contract requires explicit active/replaced
   session lifecycle and durable remaining-queue membership.
