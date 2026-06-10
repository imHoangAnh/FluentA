# Design

## Domain Model

Add a user-owned `ReviewSettings` entity with `NewCardsPerDay` and
`ReviewCardsPerDay`. Defaults are `20` and `200`; values must be integers from
`0` through `1000`.

## Application Flow

Settings reads return stored values or defaults. Settings updates create or
update the authenticated user's row.

The Spaced due query validates the browser timezone, derives the learner-local
day's UTC bounds, counts distinct All Words card IDs reviewed globally during
that window, and applies the remaining allowances to the selected owned All
Words deck.

## Interface Contract

- `GET /api/v1/flashcards/settings`
- `PUT /api/v1/flashcards/settings`
- `GET /api/v1/flashcards/decks/{deckId}/due?timeZoneId=...`
- protected `/settings/review` route

The due response includes deck identity, configured limits, consumed/remaining
allowances, category counts, and cards ordered overdue, due today, then new.

## Data Model

Create one `review_settings` row per user with a unique `user_id`. Continue to
use `card_reviews`, `flashcard_cards`, and `flashcard_decks` for daily usage and
due selection.

## UI / Platform Impact

Add a review-settings page and Spaced mode for All Words decks. Page Deck and
All Words Normal/Shuffle behavior remains unchanged.

## Observability

Existing canonical request logs cover settings and due requests without
logging vocabulary content or tokens.

## Alternatives Considered

1. Per-board settings. Rejected by locked global-limit decisions.
2. Client-calculated allowances. Rejected because ownership and local-day
   accounting must remain server-owned.
3. Background-built Redis queues. Rejected for this MVP slice because the
   indexed database query is simpler and preserves real-time correctness.
