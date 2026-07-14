# Validation — US-FE-009

| Assumption | Evidence | Result |
| --- | --- | --- |
| Route can cut over unchanged. | Legacy manifest has one independent `todo` entry. | READY |
| Realtime can move without behavior drift. | `useTodoSync` invalidates `['todo']` with `refetchType: 'all'`. | READY |
| Dashboard can use public Todo API. | It currently consumes only Todo list/update calls. | READY |

## Implementation and review evidence

| Acceptance criterion | Evidence | Result |
| --- | --- | --- |
| `/todo` is feature-composed without a URL change. | `todoRoutes` is lazy-composed by `app/router.tsx`; the legacy manifest and its test no longer contain `todo`. | PASS |
| Todo owns its UI, API/types, and realtime behavior. | The day/week pages, API/types, and `useTodoSync` now live under `features/todo`. | PASS |
| Cache and realtime behavior are preserved. | The moved hook still invalidates `['todo']` and `['dashboard']` with `refetchType: 'all'`; live cross-tab E2E passed. | PASS |
| Consumers use the public boundary. | Dashboard, Pomodoro, and the protected runtime import `@/features/todo`; old Todo path and cross-feature deep-import scans returned no matches. | PASS |

## Commands and results

- `npm --prefix src/frontend run test:run -- src/test/app/App.test.tsx src/test/app/legacy-routes.test.tsx src/test/app/protected-runtime.test.tsx src/test/dashboard/DashboardPage.test.tsx` — PASS: 4 files, 17 tests.
- `npm --prefix src/frontend run test:run` — PASS: 18 files, 58 tests.
- `npm --prefix src/frontend run lint` — PASS.
- `npm --prefix src/frontend run build` — PASS. Rolldown reported known third-party `@microsoft/signalr` pure-annotation warnings only.
- `npm --prefix src/frontend run test:e2e -- personal-productivity-integration.spec.js e27-route-manifest.spec.js` — PASS: authenticated cross-tab Todo sync plus desktop/tablet route manifest, 3 tests.
- `rg -n -e 'lib/api/todo' -e 'lib/realtime/useTodo' -e 'routes/todo' src/frontend/src src/frontend/e2e` — PASS: no active legacy Todo paths.
- `rg -n -e '@/features/.+/' src/frontend/src/app src/frontend/src/features` — PASS: no cross-feature deep imports.
- `git diff --check` — PASS.
- Harness verification initially rejected a semicolon-separated multi-command
  verifier (`npm` interpreted `test:run;` as a script name). The stored
  verifier was corrected to the single full-Vitest command; the broader lint,
  build, and E2E proof remains recorded above.

## Review findings

No P1, P2, or P3 findings. The migration changes only frontend ownership and
imports; request payloads, routes, query keys, realtime invalidation, backend
contracts, and user-visible Todo behavior remain unchanged.
