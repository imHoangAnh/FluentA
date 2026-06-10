# Design

## Domain Model

No new domain entities. The dashboard read model uses `FlashcardCard`, `FlashcardDeck`, `VocabBoard`, and `CardReview`.

## Application Flow

The flashcard service validates the browser timezone and asks the repository for an overall or board-scoped dashboard snapshot.

## Interface Contract

- `GET /api/v1/flashcards/dashboard?timeZoneId=...`
- `GET /api/v1/flashcards/dashboard/{boardId}?timeZoneId=...`

The response includes total cards, total reviews, streak days, retention rate, overdue count, due-today count, new-card count, and seven forecast points.

## Data Model

No migration. Queries use existing card/review indexes.

## UI / Platform Impact

The flashcard page displays dashboard cards above the deck list. The forecast is rendered with CSS bars to avoid adding a charting dependency.

## Observability

Dashboard requests use the existing request log middleware.

## Alternatives Considered

1. Add persisted aggregate rows. Rejected for MVP because current query volume is small and the source records already exist.
