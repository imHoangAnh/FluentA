# Discovery: Backend Bounded Context Split

## Source Of Truth

- `SPEC.md` Section 20
- `history/backend-bounded-context-split/CONTEXT.md`
- `docs/product/flashcards.md`
- `docs/product/learning-workflows.md`
- `docs/ARCHITECTURE.md`

## Architecture Snapshot

- The product already behaves as three learning workflows: Flashcard viewer,
  Practice, and Review.
- Backend ownership is still concentrated in the existing Flashcards module:
  `FlashcardsController`, `IFlashcardService`, `FlashcardService`,
  `IFlashcardRepository`, and `EfFlashcardRepository`.
- Current domain entities for deck reads, practice summaries/settings, review
  settings, SRS state/history, and scheduling all live under
  `FluentA.Domain/BoundedContexts/Flashcards`.
- `AppDbContext` exposes one mixed learning set: `FlashcardDecks`,
  `FlashcardCards`, `PracticeSessionSummaries`, `PracticeSettings`,
  `ReviewSettings`, `WordReviewStates`, and `WordReviewHistories`.
- EF configuration currently maps these tables without context-owned
  PostgreSQL schemas.
- Frontend learning calls are mostly centralized in
  `src/frontend/src/lib/api/flashcard.api.ts`, but tests still reference both
  current and older endpoint shapes.

## Current Backend Surface

| Area | Current files | Current responsibility |
| --- | --- | --- |
| API | `src/backend/FluentA.API/Controllers/FlashcardsController.cs` | Deck reads, practice summaries, Add to Review, review sessions, dashboard, practice settings, review settings, review answers. |
| Application | `src/backend/FluentA.Application/BoundedContexts/Flashcards/FlashcardService.cs` | Orchestrates Flashcard, Practice, and Review behavior through one service. |
| Application ports | `src/backend/FluentA.Application/BoundedContexts/Flashcards/IFlashcardService.cs`, `IFlashcardRepository.cs` | Mixes deck contracts, practice contracts, review contracts, settings, dashboard, and SRS persistence. |
| Persistence | `src/backend/FluentA.Infrastructure/Flashcards/EfFlashcardRepository.cs` | Reads/writes all current learning tables and owns due queue queries. |
| Domain | `src/backend/FluentA.Domain/BoundedContexts/Flashcards/Entities/*` | Contains Flashcard deck/card, Practice settings/summary/mode, Review settings/state/history, and SRS scheduler types. |
| Vocabulary sync | `VocabularyService`, `IVocabularyRepository`, `EfVocabularyRepository` | Vocabulary creates and updates Flashcard decks/cards directly and must later emit context-owned sync/cleanup behavior. |

## Current Endpoint Families

| Current endpoint | Target context | Notes |
| --- | --- | --- |
| `GET /api/v1/flashcards/decks` | Flashcard | Keep as Flashcard read model. |
| `GET /api/v1/flashcards/decks/{deckId}/cards` | Flashcard | Keep as read-only viewer/session setup surface. |
| `POST /api/v1/flashcards/practice-sessions` | Practice | Move to Practice-owned endpoint family. |
| `POST /api/v1/practice/add-to-review` | Practice + Review port | Endpoint can stay under Practice, but implementation must call Review through an application port. |
| `POST /api/v1/review/sessions` | Review | Already target-shaped; remove legacy `flashcards/sessions` compatibility route. |
| `GET /api/v1/review/sessions/{sessionId}/summary` | Review | Already target-shaped; remove legacy `flashcards/sessions/{id}/summary` compatibility route. |
| `GET /api/v1/flashcards/dashboard...` | Review | Dashboard/stats move to Review endpoint family. |
| `GET/PUT /api/v1/practice/settings` | Practice | Controller and service move to Practice. |
| `GET/PUT /api/v1/review/settings` | Review | Controller and service move to Review. |
| `POST /api/v1/review` | Review | Keep as Review answer submission; remove legacy `flashcards/review` route. |

## Target Ownership From Locked Decisions

| Context | Owns | Integration boundary |
| --- | --- | --- |
| Flashcard | Page deck/card read model and deck/card sync from Vocabulary. | Receives Vocabulary sync event/handler calls. |
| Practice | Practice settings, practice session summaries, practice workflow persistence, and Add to Review command. | Calls Review through `IReviewEnrollmentPort` or equivalent application port. |
| Review | SRS state/history, Review settings, FluentA SRS scheduler, review sessions, answer persistence, and dashboard/stats. | Receives cleanup from Vocabulary deletion and enrollment requests from Practice. |

## Primary Risks

- API cutover is one-time and removes old endpoints; frontend, Vitest, and
  Playwright must be updated in the same feature.
- Vocabulary currently imports Flashcard domain/application types and writes
  Flashcard tables directly, so the sync split is the highest coupling risk.
- Moving EF tables into PostgreSQL schemas can be destructive in local/dev, but
  any production/user-data deployment needs an explicit preserve-data path.
- Practice and Review share workflow timing through Add to Review; this must be
  a port call rather than direct table writes after the split.
- Dashboard ownership moves from Flashcard naming to Review, so dashboard tests
  must prove due/overdue, retention, forecast, board stats, and new-to-review
  values still match expected behavior.

## Constraints

- Keep the modular monolith deployment model.
- Do not introduce separately deployed services, separate databases, a message
  broker, outbox, or shared Learning kernel in this feature.
- Do not change user-visible learning workflow semantics, Practice modes, SRS
  algorithm behavior, or Review random-mode semantics.
- Preserve owner scoping and deleted-row non-disclosure behavior.
- Preserve current transactional guarantees for Vocabulary-to-learning sync
  where immediate consistency is required.

## Summary

The repo already has the product split, but the backend still has one mixed
Flashcards module doing Flashcard, Practice, and Review work. Feature 20 should
be treated as a high-risk architecture cutover: first lock the current contract
map, then split domain/application ports, then persistence/schema, then API and
frontend endpoints, and finally Vocabulary sync plus release proof.
