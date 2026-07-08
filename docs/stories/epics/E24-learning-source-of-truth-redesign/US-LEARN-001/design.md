# Design

## Domain Model

- `VocabBoard`, `VocabPage`, and `VocabWord` become the active content source
  for Flashcard and Practice reads.
- This slice does not add new domain entities yet; it removes read dependence
  on synchronized `FlashcardDeck` and `FlashcardCard` for the active
  Flashcard/Practice surfaces.

## Application Flow

- Flashcard list query loads owner-scoped active boards, pages, and words from
  vocabulary ownership.
- Flashcard page session query loads one page plus its active words in page
  creation order.
- Practice session setup reuses the same page session query contract.
- Practice summary save continues to validate against the current active page
  word count, but the request becomes page-based instead of deck-based.

## Interface Contract

- Flashcard list returns boards with nested pages, not deck entities.
- Flashcard session route becomes page-based and owner-scoped.
- Practice session route becomes page-based and owner-scoped.
- Request/response DTOs use `pageId` naming for page-scoped learning flows.
- Existing Practice settings routes remain unchanged in this slice.

## Data Model

- No migration is required for the read cutover itself.
- Existing `practice_session_summaries` persistence remains temporarily live,
  but this slice updates it to validate and store against page ownership.
- Legacy `flashcard_decks` and `flashcard_cards` remain in the schema until the
  cleanup story removes them.

## UI / Platform Impact

- Frontend routes move from `/flashcards/decks/:deckId` and
  `/flashcards/decks/:deckId/practice` to page-based routes.
- Flashcard list labels shift from `deck` language to `page` language.
- Existing viewer and practice session UI are retained where compatible.

## Observability

- No new logs are required.
- Owner-scoped 404 behavior must remain unchanged for foreign pages.

## Alternatives Considered

1. Keep deck-shaped DTOs but fill them from vocabulary tables.
   Rejected because it would preserve stale semantics and leave the page-based
   contract incomplete.
