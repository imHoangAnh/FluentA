# Validation — US-FE-006

## Reality gate

| Assumption | Risk | Evidence | Result |
| --- | --- | --- | --- |
| Flashcards can be separated from mixed Practice/Review API ownership. | Medium | `flashcard.api.ts` has distinct `/flashcards/*`, `/practice/*`, and `/review/*` endpoint families. | READY |
| Existing Practice library can consume Flashcards without an early Practice feature migration. | Medium | Its deck data, session data, and realtime hook are a public Flashcards contract; Practice-only dialog/session code remains separate. | READY WITH CONSTRAINTS |
| Routes can migrate without URL change. | Medium | Current legacy manifest defines `flashcards` and `flashcards/pages/:pageId` as independent lazy entries. | READY |

## Constraints

- Retain exact `['flashcard', 'boards']` and `['flashcard', 'page-session',
  pageId]` query keys and the existing 1500 ms library refetch interval.
- Preserve the FlashcardDeckUpdated invalidation behavior.
- Do not move `/practice` or `/review` endpoint ownership ahead of their
  approved stories.

## Review and proof

| Gate | Command / evidence | Result |
| --- | --- | --- |
| Focused route tests | `npm --prefix src/frontend run test:run -- src/test/app/App.test.tsx src/test/app/legacy-routes.test.tsx` | Passed: 2 files, 12 tests. |
| Full frontend unit suite | `npm --prefix src/frontend run test:run` | Passed: 18 files, 58 tests. |
| Feature and consumer E2E | `npm --prefix src/frontend run test:e2e -- flashcard-viewer.spec.js` | Passed: protected route, live board/page/word creation, refresh, viewer, Practice link, deletion, and owner-scoped API proof. |
| Route and Practice regression | `npm --prefix src/frontend run test:e2e -- e27-route-manifest.spec.js e29-practice-library.spec.js` | Passed: 7/7 across desktop/tablet and Practice query/modal/responsive flows. |
| Static quality | `npm --prefix src/frontend run lint` and `npm --prefix src/frontend run build` | Passed. Build retains only known SignalR/Rolldown pure-annotation warnings. |
| Boundary scans | Old Flashcards page/component/hook scan and app/feature deep-import scan | Passed. Remaining `lib/api/flashcard.api.ts` functions are exclusively Practice/Review endpoint owners pending US-FE-007/008. |
| Diff safety | `git diff --check` | Passed; Windows line-ending notices only. |

## Review findings

- P1/P2/P3: none.
- The prior live viewer scenario asserted superseded deck markup and endpoint
  paths. It was updated to prove the existing board/page deck-card and viewer
  workflow; no production UX changed.
- `/practice` is temporarily implemented by `routes/practice/PracticeLibraryPage`
  and consumes the explicit `@/features/flashcards` public contract. This is a
  bounded dependency, not a compatibility barrel, and transfers to
  `features/practice` in US-FE-007.
- No backend, API payload, schema, route URL, cache key, refetch interval, or
  realtime invalidation behavior changed.
