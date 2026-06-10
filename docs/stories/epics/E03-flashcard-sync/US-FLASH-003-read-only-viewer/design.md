# Design

## Backend

Add an owner-scoped read-only flashcard service and
`GET /api/v1/flashcards/decks`. The endpoint returns active decks with active
cards as a grouped read model and never exposes another user's data.

## Frontend

Add protected `/flashcards`, link it from the workspace, render cards grouped by
board/deck, and use TanStack Query for the read model. A scoped SignalR
connection invalidates the flashcard-decks query on `FlashcardDeckUpdated`.

## Data Model

No schema change.
