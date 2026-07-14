# Validation — US-FE-007

## Reality gate

| Assumption | Risk | Evidence | Result |
| --- | --- | --- | --- |
| Practice can become a feature without changing its public URLs. | Medium | The legacy manifest has separate `practice` and `practice/:pageId` lazy entries and App route tests cover the manifest. | READY |
| The mixed legacy adapter can split by endpoint owner. | Medium | Its `/practice/settings`, `/practice/sessions`, and `/practice/add-to-review` calls are independent from the remaining `/review/*` calls. | READY |
| Practice can consume Flashcard data without a cross-feature deep import. | Medium | The temporary library/session pages already use `@/features/flashcards` public exports for board and page-session data. | READY |
| Existing behavior is observable before cutover. | High | Focused App/legacy-route Vitest passed 12/12 and mocked-browser E29 Practice proof passed 5/5 on 2026-07-14. | READY |

## Constraints

- Preserve `['flashcard', 'boards']`, `['flashcard', 'page-session', pageId]`,
  and `['practice', 'settings']` query keys and all current endpoint payloads.
- Do not alter page/session routes, `deck` or `order` URL parameters, speech
  interaction, or deck-card layout.
- Do not move Review ownership before US-FE-008.

## Implementation authorization

The approved E30 goal grants implementation authority for this dependency-order
story after the reality gate. The authorized scope is only US-FE-007.

## Review and proof

| Gate | Command / evidence | Result |
| --- | --- | --- |
| Focused route tests | `npm --prefix src/frontend run test:run -- src/test/app/App.test.tsx src/test/app/legacy-routes.test.tsx` | Passed: 2 files, 12 tests. |
| Full frontend unit suite | `npm --prefix src/frontend run test:run` | Passed: 18 files, 58 tests. |
| Practice route and workflow E2E | `npm --prefix src/frontend run test:e2e -- e29-practice-library.spec.js practice-workflow.spec.js e27-route-manifest.spec.js` | Passed: 8/8 across mocked `deck`/shuffle/responsive proof, live completion/add-to-review behavior, and desktop/tablet manifest coverage. |
| Static quality | `npm --prefix src/frontend run lint` and `npm --prefix src/frontend run build` | Passed. Build retains only known SignalR/Rolldown pure-annotation warnings. |
| Boundary scans | Legacy Practice path/API scan and app/feature deep-import scan | Passed: no active `routes/practice`, `routes/flashcards/PracticeSessionPage`, or legacy Practice adapter calls; no cross-feature deep imports. |
| Diff safety | `git diff --check` | Passed; Windows line-ending notices only. |

## Review findings

- P1/P2/P3: none.
- The migration initially left the moved launch-dialog import at its former
  sibling location. Focused routes/build exposed it and the feature-local
  import was corrected before final proof.
- The existing live workflow proof searched for a child button within the deck
  button itself. It now selects the stable deck-card test id and asserts the
  same accessible name; production behavior did not change.
- No backend, API payload, schema, route URL, cache key, refetch interval,
  speech/session behavior, or responsive UI behavior changed.
