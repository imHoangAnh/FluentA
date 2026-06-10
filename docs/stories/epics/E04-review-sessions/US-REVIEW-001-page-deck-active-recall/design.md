# Design

## Domain Model

Reuse `CardReview`, `ReviewRating`, and existing card scheduling fields. Page
Deck review records snapshot the unchanged interval and ease factor.

## Application Flow

The browser creates an ephemeral session ID, fetches owner-scoped Page Deck
cards, orders them Normal or Shuffle, and submits one rating command per card.
The server verifies ownership and Page Deck type, then inserts the review
without scheduling mutation.

## Interface Contract

- `GET /api/v1/flashcards/decks/{deckId}/cards`
- `POST /api/v1/flashcards/review`
- protected route `/flashcards/decks/{deckId}/review`

## Data Model

No migration. Existing `card_reviews` and flashcard card/deck records are
sufficient.

## UI / Platform Impact

Adds mode selection, front/reveal/back states, best-effort Web Speech API TTS,
rating buttons and keyboard shortcuts, progress, and immediate summary.

## Observability

Existing request logs record review commands without logging card content.

## Alternatives Considered

1. Persist session/summary records. Rejected by locked ephemeral decisions.
2. Update scheduling for Page Deck ratings. Rejected by D1.
