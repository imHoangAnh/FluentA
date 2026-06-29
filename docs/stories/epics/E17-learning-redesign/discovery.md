# Discovery: Learning Redesign

## Architecture Snapshot

- Frontend routes under `src/frontend/src/routes/flashcards/` currently own
  deck list, practice session, and review session behavior.
- Dashboard navigation and review CTA logic live in
  `src/frontend/src/routes/dashboard/DashboardPage.tsx`.
- API client shapes live in `src/frontend/src/lib/api/flashcard.api.ts`.
- Backend flashcard and review orchestration lives in
  `src/backend/FluentA.Application/BoundedContexts/Flashcards/`.
- Flashcard persistence and due-queue logic live in
  `src/backend/FluentA.Infrastructure/Flashcards/EfFlashcardRepository.cs`.
- Vocabulary creation/update/delete paths still create and maintain All Words
  decks through `VocabularyService` and `EfVocabularyRepository`.

## Current Contract And Model Gaps

- `docs/product/flashcards.md` still documents All Words decks, flashcard
  dashboard stats, Page Deck active recall, and All Words SM-2 review as the
  current learning contract.
- Feature 13 practice is implemented, but it persists summary-only history and
  explicitly avoids SRS mutation.
- `DeckType.AllWords` is still a first-class backend and frontend concept.
- Review settings currently model `newCardsPerDay` and `reviewCardsPerDay`,
  which does not match the approved Feature 14 global `300 words/day` limit and
  recap-after-answer setting.
- Current dashboard widgets and home-page CTA behavior assume a usable
  All Words review deck exists.

## Constraints

- The redesign is hard to reverse because it changes product navigation, data
  ownership, migration behavior, review persistence timing, and proof shape.
- Existing Feature 13 dictation, meaning-to-word, and pronunciation UI should
  be reused rather than rebuilt.
- Speech support must remain browser-native and gracefully degrade when speech
  recognition is unavailable.
- `SPEC.md` is currently dirty in the worktree, so planning artifacts should
  live in `docs/` and avoid relying on direct spec edits.

## Summary

The repo already has reusable practice interactions and deterministic SM-2
logic, but the current surface area is still organized around the old All Words
deck model. The redesign needs a new product contract, a deck-model migration,
new review-state ownership, and a release plan that explicitly covers dashboard
and settings fallout.
