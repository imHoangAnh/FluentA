# Validation

## Proof Strategy

Prove the frontend no longer references removed mixed learning endpoints, then
verify the main frontend route consumers still work through the owned Practice
and Review route families.

## Test Plan

| Layer | Cases |
| --- | --- |
| Static scan | No frontend source or focused specs reference removed mixed Practice/Review routes. |
| Frontend static proof | `lint`, `Vitest`, and `build` pass after the client/query-key cutover. |
| Focused browser proof | At least one Practice-focused browser flow and one Review-aligned runtime smoke prove the owned route families execute successfully. |
| Exception handling | Any failing focused specs must be classified as route-cutover regressions versus unrelated stale UI/test assumptions. |

## Commands

```text
rg -n "/api/v1/flashcards/practice-sessions|/api/v1/flashcards/sessions|/api/v1/flashcards/review|/api/v1/flashcards/dashboard|word_review_states|word_review_histories|\['flashcard', 'practice-settings'\]|\['flashcard', 'settings'\]|\['flashcard', 'dashboard'\]" src/frontend -S
npm --prefix src/frontend run lint
npm --prefix src/frontend run test:run
npm --prefix src/frontend run build
npm --prefix src/frontend run test:e2e -- e2e/practice-workflow.spec.js
npm --prefix src/frontend run test:e2e -- e2e/review-workflow.spec.js
git diff --check
```

## Acceptance Evidence

To complete this story, record:

- active frontend client calls use `/practice/*` and `/review/*` where owned
- active React Query keys use Practice/Review ownership for settings/dashboard
- removed mixed backend routes are absent from the active frontend/test surface
- frontend lint, Vitest, and build pass
- at least one focused runtime proof passes on the new route family
- any remaining focused test failures are documented with their true root cause
