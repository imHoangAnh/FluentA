# Validation

## Proof Strategy

Treat this as an epic closeout story: prove that the split works across code
ownership, schema ownership, active routes, and user-visible learning flows.

## Test Plan

| Layer | Cases |
| --- | --- |
| Static scan | Removed mixed Practice/Review endpoints are absent from backend controllers and active frontend source. |
| Backend proof | Focused backend tests and API build pass after the full split. |
| Frontend static proof | `lint`, `Vitest`, and `build` pass. |
| Focused runtime proof | Flashcard viewer, Practice/Add to Review, Review, dashboard/stats, and settings execute against the new route families. |
| Live sync/schema proof | Vocabulary create/update/delete still drives Flashcard and Review side effects, and runtime tables live under owned schemas. |

## Commands

```text
rg -n "/api/v1/flashcards/(practice-sessions|sessions|review|dashboard|practice-settings|settings)" src/backend/FluentA.API src/frontend/src src/frontend/e2e -S
rg -n "IReviewEnrollmentPort|IVocabularyReviewCleanupPort|IFlashcardVocabularySyncPort|review\\.word_states|review\\.word_histories|practice\\.settings|practice\\.session_summaries|flashcards\\.decks|flashcards\\.cards" src/backend -S
dotnet test src/backend/FluentA.Application.UnitTests/FluentA.Application.UnitTests.csproj
dotnet build src/backend/FluentA.API/FluentA.API.csproj --no-restore
npm --prefix src/frontend run lint
npm --prefix src/frontend run test:run
npm --prefix src/frontend run build
npm --prefix src/frontend run test:e2e -- e2e/flashcard-viewer.spec.js
npm --prefix src/frontend run test:e2e -- e2e/practice-workflow.spec.js
npm --prefix src/frontend run test:e2e -- e2e/review-workflow.spec.js
npm --prefix src/frontend run test:e2e -- e2e/spaced-daily-planning.spec.js
git diff --check
```

## Acceptance Evidence

To complete this story, record:

- removed legacy mixed Practice/Review endpoints are absent or unreachable
- backend ownership scans line up with Flashcard, Practice, and Review
- backend and frontend static proof pass
- focused runtime proof covers the shipped learning workflows
- Vocabulary sync and Review cleanup still work after the split
- owned PostgreSQL schemas are visible in code or runtime evidence
- any remaining blockers are classified honestly as release blockers or
  unrelated historical drift
