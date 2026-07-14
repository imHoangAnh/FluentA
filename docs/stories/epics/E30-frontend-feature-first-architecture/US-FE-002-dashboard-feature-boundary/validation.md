# US-FE-002 Validation

## Status

- Planning complete: 2026-07-14
- Reality gate: **IMPLEMENTED AND REVIEWED**
- Validated: 2026-07-14
- Implemented and reviewed: 2026-07-14
- Lane: normal
- Implementation: complete

The approved ownership move is complete. Dashboard now owns its page and lazy
index route under `features/dashboard`; the legacy Dashboard route/path is
gone, while product behavior and cross-domain contracts remain unchanged.

## Acceptance Matrix

| Acceptance criterion | Final evidence | Result |
| --- | --- | --- |
| `/` is owned by Dashboard's public feature API | `app/router.tsx` composes `dashboardRoutes`; the feature index exports only that route manifest. | PASS |
| No Dashboard legacy route/source remains | `app/legacy-routes.tsx` has no Dashboard index; `src/routes/dashboard` is absent; structural scans found no active old-path imports. | PASS |
| Dashboard behavior is preserved | Focused tests cover loading, empty, populated, local date/timezone arguments, Todo/Habit mutations, and query invalidation. | PASS |
| Protected/app composition remains intact | App and legacy-manifest suites passed; authenticated desktop/tablet route-manifest E2E passed. | PASS |
| Live Dashboard actions still work | Corrected current-contract E2E passed with persisted Todo and Habit actions. | PASS |
| UI remains responsive and accessible | Existing desktop/tablet design-system and route-manifest proof passed; semantic heading and loading state assertions remain covered. No markup redesign was introduced. | PASS |
| Build and lazy boundary remain valid | Production build passed and emitted an independent `DashboardPage` chunk. | PASS |
| Backend/security/data contracts are unchanged | No backend, API contract, auth, authorization, database, schema, persistence, or token-storage file changed. | PASS |

## Feasibility Matrix

| Assumption | Risk | Evidence | Result |
| --- | --- | --- | --- |
| A feature-owned lazy index can coexist with remaining legacy routes | Duplicate or ambiguous index routes could break `/`. | Disposable `createMemoryRouter` probe composed one lazy feature index plus a legacy sibling, rendered `/`, navigated to `/legacy`, and passed 2/2 combined feasibility tests. The probe was removed. | READY |
| Dashboard can render after its source path moves | Alias mocks, providers, or lazy Journal import could fail after relocation. | The same disposable probe rendered the current Dashboard through isolated `AppProviders` and mocked Todo/Habit/Countdown/Review/Journal modules, including empty states. | READY WITH CONSTRAINT |
| Current behavior has a clean baseline | Existing failures could be misattributed to the move. | Frontend lint passed; full Vitest passed 17 files/55 tests; production build passed and emitted an independent `DashboardPage` chunk. | READY |
| Protected route behavior is observable | A component-only test could miss auth, AppShell, or route composition regressions. | Current E27 route manifest passed desktop and tablet 2/2 against the running frontend and API. Existing App tests cover anonymous/authenticated `/`. | READY |
| API-backed Dashboard actions remain testable | Stale fixtures could fail before reaching Todo/Habit mutations. | Original `dashboard-overview.spec.js` failed first on obsolete `Dashboard Overview`. A disposable correction to `Overview` then exposed an obsolete Countdown DTO. With `targetDate: YYYY-MM-DD` plus `alerts`, the full live scenario passed 1/1, including persisted Todo/Habit toggles. Both test edits were reverted after the probe. | READY WITH CONSTRAINT |
| Temporary cross-domain imports can remain bounded | Moving other domain adapters now would violate story order; leaving them implicit would hide debt. | Source inventory found exactly Review, Todo, Countdown, Habit/icon, and Journal preload dependencies. Their replacement stories are US-FE-008, 009, 014, 015, and 011 respectively. | READY WITH CONSTRAINT |
| Current UI/product behavior can remain unchanged | Product docs and older tests contain historical expectations. | Runtime and canonical E27 proof use `Overview`; current source renders one nearest Countdown. This story can move ownership without choosing new behavior. | READY WITH CONSTRAINT |
| No backend/security/data work is required | Cross-layer changes would exceed the approved normal slice. | Dashboard owns no API or store; all endpoints, Auth state, token transport, schema, and persistence remain unchanged. Live runtime was available on frontend/API/PostgreSQL/Redis ports. | READY |

## Required Constraints

1. **Use one protected index route.** Add the feature index and remove the
   Dashboard legacy index in the same change. The manifest test must prove no
   remaining `<index>` debt entry.
2. **Move ownership without refactoring behavior.** Preserve current helper
   logic, query keys, date/timezone arguments, sorting/limits, mutations,
   invalidation, loading/empty UI, AppShell title, and Journal preload.
3. **Keep legacy dependencies explicit.** Do not copy or re-export Review,
   Todo, Countdown, Habit, icon, or Journal modules into Dashboard. Only their
   later owning stories may replace those imports with feature public APIs.
4. **Repair the focused Dashboard E2E contract.** Change the heading locator to
   the shipped `Overview` title and create Countdown data with the current DTO:
   date-only `targetDate` and at least one `{ alertDay, alertTime }` item.
5. **Do not restore widget settings.** `spec1-final-verification.spec.js`
   retains a separate stale localStorage/widget assertion. It is not blocking
   proof for this architecture slice and must not cause removed UI to be
   reintroduced.
6. **Do not resolve Countdown product drift.** Preserve the current one-event
   runtime limit. The product document's historical three-event wording is a
   separate product reconciliation decision.
7. **Keep focused test ownership honest.** Move Dashboard behavior assertions
   under `src/test/dashboard`; retain only app composition/navigation behavior
   under `src/test/app` and do not duplicate cases.
8. **Close structural debt.** No file/import may remain under
   `src/routes/dashboard`, Dashboard must disappear from
   `app/legacy-routes.tsx`, and app must import routes from the Dashboard public
   index.

## Baseline And Runtime Evidence

- `US-FE-001` is implemented and verified with all four proof flags.
- Current Dashboard is one page under `src/routes/dashboard` and one protected
  legacy index route.
- Dashboard has no owned API/store/schema. It composes Auth plus five explicit
  unmigrated domain dependencies documented in `design.md`.
- Current focused baseline passed:

```text
npm exec -- vitest run src/test/app/App.test.tsx src/test/app/legacy-routes.test.tsx
PASS - 2 files, 13 tests

npm --prefix src/frontend run lint
PASS

npm --prefix src/frontend run test:run
PASS - 17 files, 55 tests

npm --prefix src/frontend run build
PASS - independent DashboardPage chunk; known SignalR/Rolldown annotation warnings only

npm --prefix src/frontend run test:e2e -- e27-route-manifest.spec.js
PASS - desktop and tablet, 2/2

disposable router plus mocked-Dashboard feasibility probe
PASS - 1 file, 2 tests; probe removed

npm --prefix src/frontend run test:e2e -- dashboard-overview.spec.js
EXPECTED BASELINE FAILURE - obsolete Dashboard Overview locator

same Dashboard E2E with disposable current-contract fixture
PASS - 1/1; title and Countdown fixture edits reverted after proof
```

## Planned Proof

| Layer | Required evidence |
| --- | --- |
| Unit/component | Dashboard loading, empty, populated, links, Todo toggle, Habit toggle, date/timezone arguments; protected `/` route; legacy manifest debt shrinks by one. |
| Integration | Existing adapter mocks/API-backed flow proves Todo/Habit mutations and query invalidation behavior. |
| E2E | Direct authenticated `/`, Dashboard overview actions, and E27 route manifest at desktop/tablet with no lazy/provider/console errors. |
| Platform | ESLint, full Vitest, TypeScript/Vite build, Dashboard lazy chunk inspection, old-path/deep-import scan, `git diff --check`. |
| Security/data | No backend, auth, authorization, schema, persistence, or token-storage change. |

## Final Proof

```text
npm exec -- vitest run src/test/dashboard/DashboardPage.test.tsx src/test/app/App.test.tsx src/test/app/legacy-routes.test.tsx
PASS - 3 files, 16 tests

npm --prefix src/frontend run lint
PASS

npm --prefix src/frontend run test:run
PASS - 18 files, 58 tests

npm --prefix src/frontend run build
PASS - independent DashboardPage chunk (10.03 kB, gzip 3.30 kB)
NOTE - existing non-fatal SignalR/Rolldown INVALID_ANNOTATION warnings remain

npm --prefix src/frontend run test:e2e -- dashboard-overview.spec.js e27-route-manifest.spec.js design-system-milestone.spec.js
PASS - 5/5 (Dashboard live flow 1, route manifest desktop/tablet 2,
design-system milestone desktop/tablet 2)

old-path, legacy-entry, and feature deep-import scans
PASS

git diff --check
PASS - line-ending conversion warnings only
```

## Review Findings

- No P1 or P2 finding remains.
- Pre-existing bounded P3: `e2e/spec1-final-verification.spec.js` still expects
  the historical `Dashboard Overview` heading and removed
  `dashboard-visible-widgets` setting. This architecture story intentionally
  does not restore that removed product UI.
- Pre-existing product/runtime drift: the product document describes up to
  three Countdowns, while current Dashboard runtime intentionally displays the
  nearest one. The approved story preserved runtime behavior and leaves that
  product decision outside this migration.
- The `frontend-ui-engineering` workflow influenced implementation by keeping
  layout, semantics, responsive behavior, and interaction states unchanged
  while moving ownership.

## Expected Commands

```powershell
npm --prefix src/frontend run lint
npm --prefix src/frontend run test:run
npm --prefix src/frontend run build
npm --prefix src/frontend run test:e2e -- dashboard-overview.spec.js e27-route-manifest.spec.js
rg -n "routes/dashboard|DashboardPage" src/frontend/src
.\scripts\bin\harness-cli.exe story verify US-FE-002
```

The structural scan may find the feature-owned page and focused tests. It must
find no active import, file, or route entry under `src/routes/dashboard` and no
Dashboard index in `app/legacy-routes.tsx`.

## Gate

Implementation and review are complete for `US-FE-002`. The constraints were
honored, all required proof layers passed, and adjacent feature migrations or
product behavior reconciliation remain outside this story.
