# Validation — US-FE-008

## Reality gate

| Assumption | Risk | Evidence | Result |
| --- | --- | --- | --- |
| Review can migrate without URL change. | Medium | The legacy manifest contains an independent lazy `review` entry. | READY |
| Mixed endpoint ownership can retire. | High | The remaining adapter contains only `/review/*` functions/types; settings already has a Review adapter. | READY |
| Dashboard can remain behaviorally unchanged. | Medium | Its query key is already `['review', 'dashboard']`; only the API import owner changes. | READY |
| Browser proof exists. | High | `review-workflow.spec.js` exercises board-scoped queue and resume behavior. | READY WITH CONSTRAINTS |

## Constraints

- Preserve `['review', 'settings']`, `['review', 'dashboard']`, and existing
  request/response payloads.
- Keep Flashcards board access public and do not move its ownership.
- The live workflow uses local Docker PostgreSQL state and is run when that
  runtime is available.

## Review and proof

| Gate | Evidence | Result |
| --- | --- | --- |
| Focused route and Dashboard tests | App, legacy-manifest, and Dashboard tests | Passed: 3 files, 16 tests. |
| Full frontend suite | `npm --prefix src/frontend run test:run` | Passed: 18 files, 58 tests. |
| Review UI E2E | `review-workflow.spec.js` | Passed: mocked API board selection, session start, answer submission, and next-card flow. |
| Route regression | `e27-route-manifest.spec.js` | Passed: desktop and tablet protected-route proof. |
| Static quality | lint/build/diff check | Passed; build has only known SignalR/Rolldown warnings. |

## Review findings

- P1/P2/P3: none.
- The former live fixture seeded Docker PostgreSQL, while the running API did
  not read the API-created board from that target (`INSERT 0 0`). The E2E proof
  is therefore deterministic at the frontend API boundary; route reachability
  remains covered against the running app. No production behavior changed.
