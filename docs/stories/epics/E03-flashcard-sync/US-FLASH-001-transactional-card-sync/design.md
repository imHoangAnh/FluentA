# Design

## Domain Model

Add `FlashcardCard`, `CardReview`, `CardState`, and `ReviewRating`.
`FlashcardCard.SyncFromWord` updates copied content only. Vocabulary words raise
added, updated, and deleted domain events.

## Application Flow

The vocabulary persistence boundary consumes durable synchronization events,
stages word/card/review changes, and commits once. Notification dispatch is a
dependent story and occurs only after commit.

## Interface Contract

No new public API endpoint in this story. Existing word CRUD gains the
synchronization side effect.

## Data Model

Add `flashcard_cards` and `card_reviews`. Enforce unique `(deck_id, word_id)`.
Use a soft word reference and required card-review relation with database
cascade deletion.

## UI / Platform Impact

None in this story.

## Observability

Existing request logs cover source word commands. Integration evidence records
card counts and deletion outcomes.

## Alternatives Considered

1. Dispatch durable card handlers after commit. Rejected because it breaks
   atomic synchronization.
2. Use an async queue. Rejected because no durable outbox exists and it adds
   unnecessary failure modes for the current slice.
