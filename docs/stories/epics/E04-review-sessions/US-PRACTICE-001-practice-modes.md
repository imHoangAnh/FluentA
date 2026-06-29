# US-PRACTICE-001 Practice Modes

## Status

implemented

## Lane

normal

## Product Contract

Learners can open Practice from any non-empty flashcard deck, choose
Dictation, Meaning -> Word, or Pronunciation on a separate route, complete a
practice-only session over all deck cards, and persist only the finished
session summary without changing SM-2 scheduling.

## Relevant Product Docs

- `SPEC.md` Section 13
- `history/flashcard-practice-modes/CONTEXT.md`
- `docs/product/flashcards.md`

## Acceptance Criteria

- Each non-empty Page Deck and All Words deck exposes a Practice entry to
  `/flashcards/decks/{deckId}/practice`.
- Dictation and Meaning -> Word use exact normalized matching and keep wrong
  attempts on the same card for retry.
- Pronunciation uses browser speech synthesis plus browser speech recognition
  where supported, and shows a clear unsupported state otherwise.
- Reveal or skip records the card as wrong, shows the answer, and advances.
- `POST /api/v1/flashcards/practice-sessions` persists only summary-level data
  for owned active decks and rejects foreign, deleted, missing, or inconsistent
  summaries.
- Practice completion never mutates interval, ease factor, repetitions, next
  review date, or card state.

## Design Notes

- Commands: `CreatePracticeSessionSummaryAsync`.
- Queries: existing `GetDeckSessionAsync`.
- API: `POST /api/v1/flashcards/practice-sessions`.
- Tables: `practice_session_summaries`.
- Domain rules: practice modes are summary-only and never append `CardReview`
  rows or update scheduling fields.
- UI surfaces: `FlashcardsPage`, `PracticeSessionPage`, `App.tsx`, and
  `flashcard.api.ts`.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | `dotnet test src/backend/FluentA.Application.UnitTests/FluentA.Application.UnitTests.csproj --filter FlashcardServiceTests` |
| Integration | `dotnet build src/backend/FluentA.API/FluentA.API.csproj --no-restore` |
| E2E | `npm --prefix src/frontend run test:e2e -- flashcard-practice.spec.js` |
| Platform | `npm --prefix src/frontend run build` |
| Release | `dotnet test src/backend/FluentA.slnx && npm --prefix src/frontend run lint && npm --prefix src/frontend run test:run` |

## Harness Delta

- Added a new normal story row for Feature 13 Practice Modes.
- Updated `docs/product/flashcards.md` with the locked practice-mode contract.

## Evidence

- `dotnet test src/backend/FluentA.Application.UnitTests/FluentA.Application.UnitTests.csproj --filter FlashcardServiceTests` passed.
- `dotnet test src/backend/FluentA.slnx` passed.
- `dotnet build src/backend/FluentA.API/FluentA.API.csproj --no-restore` passed.
- `npm --prefix src/frontend run lint` passed.
- `npm --prefix src/frontend run test:run` passed.
- `npm --prefix src/frontend run build` passed.
- `npm --prefix src/frontend run test:e2e -- flashcard-practice.spec.js` passed, including summary-only persistence, 422 inconsistent totals, 404 foreign deck rejection, unsupported-browser pronunciation fallback, and stable scheduling snapshots.
