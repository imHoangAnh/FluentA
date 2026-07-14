# Validation — US-FE-005

## Readiness

| Assumption | Risk | Evidence | Result |
| --- | --- | --- | --- |
| The feature can own the full Vocabulary client boundary without backend work. | High | Existing adapter retains `/boards` endpoints and original request/response types. | READY |
| Router migration preserves `/vocabulary`. | High | The feature exposes a lazy `vocabularyRoutes` object; app router composes it under the protected runtime. | READY |
| Behavior can be proven against the running API. | High | Live registration, verification, login, board creation, list refetch, and board-detail fetch returned 201/200/200. | READY |

## Review and proof

| Gate | Command / evidence | Result |
| --- | --- | --- |
| Focused component tests | `npm --prefix src/frontend run test:run -- src/test/vocabulary/WorkspacePage.test.tsx src/test/vocabulary/VocabTable.test.tsx` | Passed: 2 files, 9 tests. |
| Full frontend unit suite | `npm --prefix src/frontend run test:run` | Passed: 18 files, 58 tests. |
| Vocabulary browser regression | `npm --prefix src/frontend run test:e2e -- vocab-smoke.spec.js vocab-column-configuration.spec.js vocab-spreadsheet-autosave.spec.js` | Passed: 3/3 API-backed Chromium scenarios. |
| Static quality | `npm --prefix src/frontend run lint` and `npm --prefix src/frontend run build` | Passed. Build retains only the pre-existing SignalR/Rolldown pure-annotation warnings. |
| Architecture scan | `rg -n "routes/workspace|components/vocabulary|lib/api/vocabulary.api" src/frontend/src` | Passed: no active legacy Vocabulary source references. |
| Diff safety | `git diff --check` | Passed; Windows line-ending notices only. |

## Review findings

- P1/P2/P3: none.
- The initial high-risk E2E failures were stale test expectations, not a
  migration regression. A live diagnostic registration/login run observed a
  successful board POST (201), board-list refetch (200), and board-detail fetch
  (200). The specs now prove the current compact interaction model: explicit
  page creation, fixed optional-column visibility, the actual final keyboard
  column, and AlertDialog/context-menu deletion.
- No backend, API contract, database, route URL, cache-key, realtime, or
  product behavior changed.
