# US-FE-006 — Flashcards feature boundary

## Objective

Move the Flashcards library and viewer routes, deck-library UI, Flashcard
endpoint adapter/types, and FlashcardDeckUpdated subscription into
`features/flashcards`. Keep `/flashcards` and `/flashcards/pages/:pageId`
unchanged.

## Acceptance criteria

- The two Flashcards URLs are supplied by a lazy feature route object through
  the feature public API; their legacy manifest entries are removed.
- Flashcard API/types and realtime invalidation have canonical Flashcards
  ownership and preserve existing endpoint payloads and React Query keys.
- The deck library and viewer no longer have active legacy component/page/API/
  hook paths.
- `/practice` keeps its existing URL and interaction by consuming only the
  Flashcards public API until US-FE-007 migrates Practice itself.

## Out of scope

Practice session/launch ownership and `/practice*` routes belong to US-FE-007;
Review endpoints/routes belong to US-FE-008. No backend/API/schema/UX change
is authorized.
