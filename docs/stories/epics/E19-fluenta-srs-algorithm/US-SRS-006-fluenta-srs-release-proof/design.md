# Design

## Domain Model

`FluentAsrsScheduler` owns deterministic level transitions. `WordReviewState`
stores the current SRS state for an owned vocabulary word. `WordReviewHistory`
stores immutable answer snapshots with result, levels before/after, and next due
date.

## Application Flow

Practice saves summaries through `POST /api/v1/flashcards/practice-sessions`.
Only `POST /api/v1/practice/add-to-review` creates missing review-state rows.
Review starts with `POST /api/v1/review/sessions`, selects due words for one
owned board, applies the daily limit, and moves overflow to tomorrow. Answers
use `POST /api/v1/review`.

## Interface Contract

- `POST /api/v1/practice/add-to-review`
- `POST /api/v1/review/sessions`
- `POST /api/v1/review`
- `GET/PUT /api/v1/practice/settings`
- `GET/PUT /api/v1/review/settings`
- `GET /api/v1/flashcards/dashboard`

Review endpoints reject foreign, deleted, missing, or non-due state. Legacy
`/api/v1/flashcards/sessions` and `/api/v1/flashcards/review` aliases can remain
for transition compatibility.

## Data Model

`word_review_states` stores `user_id`, `word_id`, `level`,
`next_review_date`, `lapse_count`, and `last_reviewed_at`. Active state queries
must filter by owner and `deleted_at IS NULL`.

`word_review_histories` stores `user_id`, `word_id`, `session_id`,
`time_spent_seconds`, `reviewed_at`, `result`, `level_before`, `level_after`,
and `next_review_date`.

## UI / Platform Impact

Learning navigation points Review to `/review`. Practice completion shows
`Finish` and `Add to Review`. Review setup uses board selection, order, and
mode controls.

## Observability

Harness story rows and execution traces record proof commands, code paths, and
remaining regression risk.

## Alternatives Considered

1. Keep old SM-2 card scheduling as the state source. Rejected by Feature 16.
2. Automatically add Practice words to Review. Rejected by locked context.
3. Keep only `/api/v1/flashcards/*` review endpoints. Rejected because current
   product navigation exposes Review as a dedicated top-level workflow.
