# Validation Report

## Outcome

`US-BC-008` is implemented with focused release proof.

Feature 20 now has end-to-end evidence across Flashcard viewer, Practice, Add
to Review, Review, dashboard/stats, unified settings, Vocabulary sync
cleanup, schema ownership, and removed legacy endpoint families.

## Key Evidence

| Check | Result | Evidence |
| --- | --- | --- |
| Removed mixed endpoint families are absent | PASS | Static scan found no active backend/frontend references to removed Practice/Review Flashcards routes, and authenticated runtime probes returned `404` for `/flashcards/practice-sessions`, `/flashcards/sessions`, `/flashcards/dashboard`, `/flashcards/review`, `/flashcards/settings`, and `/flashcards/practice-settings`. |
| Backend ownership boundaries remain split | PASS | Static ownership scan still shows `PracticeService` using `IReviewEnrollmentPort`, Vocabulary using `IFlashcardVocabularySyncPort` and `IVocabularyReviewCleanupPort`, and Review owning `review.word_states` and `review.word_histories`. |
| Backend proof passed | PASS | `dotnet test src/backend/FluentA.Application.UnitTests/FluentA.Application.UnitTests.csproj` passed `103/103`, and `dotnet build src/backend/FluentA.API/FluentA.API.csproj --no-restore` passed with the existing `Microsoft.OpenApi` vulnerability warning. |
| Frontend static proof passed | PASS | `npm --prefix src/frontend run lint`, `npm --prefix src/frontend run test:run`, and `npm --prefix src/frontend run build` all passed; build kept the existing Rolldown/SignalR warnings only. |
| Focused runtime/browser proof passed | PASS | `flashcard-viewer.spec.js`, `practice-workflow.spec.js`, `review-workflow.spec.js`, and `spaced-daily-planning.spec.js` all passed after updating stale test assumptions to current shipped UI/timezone behavior. |
| Vocabulary sync and Review cleanup runtime smoke passed | PASS | Direct API/PostgreSQL smoke proved create -> deck/card sync, update -> copied card content refresh, review answer -> history write, and delete -> cleanup counts `cards=0, states=0, histories=0` for the deleted word. |
| Schema ownership evidence passed | PASS | Runtime `information_schema.tables` inspection returned `flashcards.cards`, `flashcards.decks`, `practice.session_summaries`, `practice.settings`, `review.settings`, `review.word_histories`, and `review.word_states`. |
| Unified settings aggregate still works | PASS | Authenticated `GET /api/v1/settings` returned `200` with both Practice and Review settings, and the `/settings` UI path saved Review `dailyLimit` through the unified page. |

## Constraints And Follow-up

- Local runtime proof required bringing Docker Desktop and the repo dev stack
  back online during validation because PostgreSQL was initially unavailable.
- The release-proof pass updated stale focused E2E assumptions around current
  auth flow, Flashcards empty-state copy, collapsed board presentation, and
  timezone handling in Review early-review checks.
