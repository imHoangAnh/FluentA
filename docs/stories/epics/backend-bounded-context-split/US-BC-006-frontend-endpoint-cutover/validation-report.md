# Validation Report

## Outcome

`US-BC-006` is implemented with focused proof and one remaining test-drift
follow-up.

Frontend API clients and active test surfaces were cut over to the owned
Practice and Review endpoint families. Frontend static proof passed, one
focused Practice Playwright flow passed on the new route family, and remaining
focused failures were classified as non-route issues.

## Key Evidence

| Check | Result | Evidence |
| --- | --- | --- |
| Removed mixed frontend routes are gone | PASS | Static scan no longer finds `/api/v1/flashcards/practice-sessions`, `/api/v1/flashcards/sessions`, `/api/v1/flashcards/review`, or `/api/v1/flashcards/dashboard` in `src/frontend`. |
| Practice client cutover is active | PASS | `src/frontend/src/lib/api/flashcard.api.ts` now posts practice summaries to `/practice/sessions`, and `practice-workflow.spec.js` passed against that route family. |
| Review client cutover is active | PASS | `flashcard.api.ts` now reads dashboard from `/review/dashboard`, and review session/summary/submit calls stay under `/review/*`. |
| Query ownership is aligned | PASS | Practice settings now use `['practice', 'settings']`; Review settings and dashboard use `['review', 'settings']` and `['review', 'dashboard']`. |
| Frontend static proof passed | PASS | `npm --prefix src/frontend run lint`, `npm --prefix src/frontend run test:run`, and `npm --prefix src/frontend run build` all passed. |
| Focused runtime proof on new routes passed | PASS | `npm --prefix src/frontend run test:e2e -- e2e/practice-workflow.spec.js` passed after local schema state was aligned with `US-BC-004`. |
| Remaining focused failures are route-cutover regressions | NO | `page-deck-active-recall.spec.js` and `all-words-sm2.spec.js` now fail on stale UI locator/copy assumptions, not removed Practice/Review endpoints. `review-workflow.spec.js` progressed to a behavior assertion mismatch (`earlyReview` expected `404`, runtime returned `200`) after schema/table references were corrected. |

## Constraints And Follow-up

- Local runtime proof required aligning the dev database to the schema-split
  state from `US-BC-004` because the running DB still had learning tables in
  `public.*`.
- Remaining browser-proof failures should be handled in follow-up story work
  for stale locator/copy assumptions and current Review behavior expectations.
