# 0009 Vocabulary Board And Page Management Slice

Date: 2026-06-09

## Status

Accepted

## Context

SPEC.md defines Vocabulary Board as the source of truth for language data and
requires board creation, page creation, and Flashcard deck side effects before
word entry. Auth and local Postgres are already available, so the next slice can
persist user-owned board/page data.

## Decision

Implement US-005 and US-006 together. Add board and page CRUD behind
authenticated user ownership checks. Create minimal `FlashcardDeck` records in
the same transaction as board/page creation: one All Words deck for each board
and one Page deck for each page.

Do not implement vocabulary-word rows, card generation, or spaced-repetition
review in this story.

## Alternatives Considered

1. Implement board management only. Rejected because page creation is the
   natural next operation and both are needed for a usable first board surface.
2. Include vocabulary word inline editing. Rejected because it introduces
   spreadsheet UX, word/card sync, and destructive delete behavior that deserve
   their own validation slice.
3. Defer deck records. Rejected because the spec explicitly calls for deck
   creation when boards and pages are created.

## Consequences

Positive:

- Learners get a usable organization surface immediately after auth.
- Later word-entry work can attach to real board/page ids and existing decks.

Tradeoffs:

- FlashcardDeck exists before the full Flashcard bounded context is complete.
- Deck sync behavior is intentionally limited to deck records until word
  management is implemented.

## Follow-Up

- Implement vocabulary word inline editing and card creation.
- Add deck list/review pages after word sync exists.
