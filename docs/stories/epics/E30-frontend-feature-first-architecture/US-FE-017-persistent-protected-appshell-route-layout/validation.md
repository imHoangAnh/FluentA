# US-FE-017 Validation

## Feasibility Result

`READY WITH CONSTRAINTS`

| Assumption | Risk | Evidence | Result |
| --- | --- | --- | --- |
| The data router can host one pathless shell layout | Incorrect nesting could change URLs or lazy loading | `app/router.tsx` already composes pathless `ProtectedRoute` and `ProtectedRuntime` parents around feature `RouteObject[]` | READY |
| Shell metadata can remain feature-owned | App could need feature imports or page effects | React Router route handles are already available on route objects; title, description, and content class are static | READY |
| Dynamic actions can stay feature-owned | Moving mutations into the shell would couple app and features | Only Notifications has a dynamic shell action; all actions can render first in page content with the existing spacing | READY |
| Realtime startup remains stable | A moved boundary could duplicate SignalR hooks | `ProtectedRuntime` is already a persistent parent and its focused lifecycle test passes | READY |
| Current baseline is fully green | Existing user work could be misattributed to this migration | Baseline app/shell/runtime/guard run on 2026-07-16: 15 passed, 1 failed; the only failure is the pre-existing commented checking state in `ProtectedRoute.tsx` | CONSTRAINT |
| User-owned changes can be preserved | Dashboard and route composition overlap | The migration needs only Dashboard's AppShell import/wrapper; greeting/card edits remain untouched. `ProtectedRoute`, `AuthShell`, and `RouteFeedback` need no story edit | READY WITH CONSTRAINT |

## Proof Strategy

The story is complete when one persistent shell owns all protected routes,
route-specific metadata still renders correctly, collapse state survives a
protected route transition, realtime lifecycle stays single-mounted, all
existing frontend tests attributable to this slice pass, and static scans find
no page-owned AppShell wrappers.

The existing `ProtectedRoute` baseline failure remains separately attributed
unless the user authorizes that change.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | AppShell injected environment, active navigation, collapse, logout, route metadata lookup, persistent collapse across navigation |
| Integration | Real app memory router reaches representative authenticated routes through one shell; protected runtime hooks mount once |
| E2E | Existing route/design-system smoke remains the browser proof when a local stack is available |
| Platform | Frontend lint, TypeScript/Vite production build, dependency-boundary and AppShell ownership scans |
| Performance | Build output inspected for unexpected eager feature imports or bundle regression warnings |
| Logs/Audit | No backend log or audit change; browser console must not report provider/router errors |

## Fixtures

- In-memory authenticated user and shell environment.
- Minimal two-route memory router for deterministic shell persistence proof.
- Existing isolated QueryClient fixtures in `src/test/app/App.test.tsx`.

## Commands

```powershell
npm --prefix src/frontend run test:run -- src/test/app/app-shell.test.tsx src/test/app/App.test.tsx src/test/app/protected-runtime.test.tsx
npm --prefix src/frontend run test:run
npm --prefix src/frontend run lint
npm --prefix src/frontend run build
npm --prefix src/frontend exec -- playwright test e2e/app-shell-persistence.spec.js --reporter=line
rg -n "AppShell" src/frontend/src/features
git diff --check
```

## Acceptance Evidence

Pre-implementation baseline:

- App, AppShell, ProtectedRuntime, and ProtectedRoute: 15 passed, 1 failed.
- Failure attribution: `ProtectedRoute` redirects idle state because its
  checking branch is commented in pre-existing user work.
- No production source was changed during readiness validation.

Implementation evidence in progress:

- Focused AppShell, app-route, and ProtectedRuntime proof: 15/15 passed.
- New route-transition test proves collapse state remains mounted while the
  accessible title and content class change from the next route handle.
- Protected route manifest test finds no content branch missing AppShell
  metadata.
- Frontend lint passed.
- TypeScript and Vite production build passed; route chunks remain lazy. The
  existing SignalR/Rolldown annotation warnings remain non-blocking.
- Full Vitest: 61/64 passed. All three failures map to pre-existing user edits:
  one commented `ProtectedRoute` checking state and two changed RouteFeedback
  strings. No failure is attributable to the AppShell migration.

## Acceptance Review

| Acceptance criterion | Evidence | Result |
| --- | --- | --- |
| One AppShell owns protected application chrome | `app/router.tsx` nests all `protectedAppRoutes` under `AppShellRouteLayout`; source scan finds no feature-page AppShell reference | PASS |
| Shell remains mounted across protected navigation | AppShell unit route transition and Chromium Playwright compare the same shell DOM node after Dashboard-to-Todo navigation | PASS |
| Route-specific presentation remains correct | Route handles preserve all prior title, description, and content-class values; unit proof observes title/content-class update | PASS |
| Dynamic actions remain feature-owned | Notifications, Habit Stats, Flashcard Viewer, Practice, and Review render their actions in page content with the existing top spacing | PASS |
| Auth and realtime boundaries do not move | `ProtectedRoute` and `ProtectedRuntime` remain above AppShell; ProtectedRuntime lifecycle proof passes | PASS |
| URLs, lazy routes, API/query contracts, and visible page content remain stable | Existing feature route objects keep paths/lazy imports; production build emits independent route chunks; no API/query source changed | PASS |
| Architecture and durable workflow truth agree | Architecture/product docs, decision 0048, story packet, Harness story, and matrix evidence are reconciled | PASS |

## Final Command Results

- Focused AppShell/App/ProtectedRuntime: 15/15 passed.
- Harness story verification: 4/4 passed.
- Chromium AppShell persistence: 1/1 passed.
- Frontend lint: passed.
- Frontend production build: passed.
- AppShell feature ownership scan: zero references.
- `git diff --check`: passed with line-ending warnings only.
- Full Vitest: 61/64 passed; the three failures are unchanged user-owned
  `ProtectedRoute` and RouteFeedback baseline edits recorded before this story.

## Known Warnings And Findings

- No P1, P2, or P3 finding is attributable to US-FE-017.
- Full-suite green status remains blocked by the pre-existing commented session
  checking branch and two pre-existing RouteFeedback string changes. The story
  deliberately does not overwrite those user edits.
- Vite retains the known non-blocking SignalR/Rolldown pure-annotation and
  plugin-timing warnings.
- The first Harness verify command used `npm exec` from the repository root and
  could not resolve the frontend alias. The stored verify command was corrected
  to `npm --prefix src/frontend run test:run -- ...` and then passed.

## Review Outcome

`IMPLEMENTED / REVIEWED / VERIFIED` for the approved AppShell migration. The
separately attributed user-owned baseline failures remain visible and were not
silently changed.
