# US-FE-001 Validation

## Status

- Reality gate: **READY WITH CONSTRAINTS**
- Validated: 2026-07-14
- Implementation: completed and reviewed 2026-07-14.
- Lane: high-risk

The story is executable with the installed frontend stack and current local
runtime. Implementation must satisfy the constraints below before any proof is
accepted.

## Feasibility Matrix

| Assumption | Risk | Evidence | Result |
| --- | --- | --- | --- |
| Installed React Router supports the approved data-router boundary | Missing APIs or incompatible lazy route shape would require replanning. | Local `react-router-dom` 7.17.0 exports `createBrowserRouter`, `createMemoryRouter`, and `RouterProvider`; installed types expose `LazyRouteFunction<RouteObject>`. A disposable Vitest probe passed lazy `{ Component }` resolution. | READY |
| Lazy route objects preserve protected outlets, nested Settings redirects, and query strings | Route conversion could change session route or nested Settings behavior. | Disposable `createMemoryRouter` probe passed protected Outlet rendering, `/practice/page-1?order=shuffle` preservation, and `/settings -> /settings/profile` nested redirect. Probe file was removed after execution. | READY |
| Current route proof can observe the migration | Missing route cases would allow a broken composition to pass. | `e27-route-manifest.spec.js` passed desktop and tablet, 2/2. Current `App.tsx` inventory has six public paths and 21 navigable protected paths; the E27 list covers 20 protected paths and omits direct `/settings`. | READY WITH CONSTRAINT |
| Auth contracts survive path/composition changes | Store/client initialization or provider movement could break register, refresh, protected routing, or logout. | Current Auth contract and source graph were inspected. Live local PostgreSQL, Redis, and API were available. `auth-email-verification.spec.js` passed registration, pre-verification login rejection, OTP verification, and login, 1/1. | READY |
| Axios transport can remain shared without importing Auth | Circular initialization could leave refresh callbacks unconfigured. | Current client already exposes neutral `configureAuthTransport` callbacks and does not import Auth; Auth store performs configuration. Preserve this dependency direction and add a focused initialization/refresh test after moving paths. | READY WITH CONSTRAINT |
| AppShell can become shared without importing Auth or feature navigation | Moving it unchanged would violate D14 immediately. | Current AppShell imports `useAuthStore` and owns product navigation. The approved app-injected neutral shell environment removes both dependencies while retaining the presentational component. No third-party capability is required. | READY WITH CONSTRAINT |
| Realtime startup can leave `ProtectedRoute` without changing behavior | Outlet/provider remounting could start duplicate connections or lose cleanup. | Current guard calls exactly four hooks: Todo, Habit, Kanban, and Pomodoro. Each hook owns an effect keyed by access token and QueryClient and stops its connection on cleanup; test mode intentionally skips real WebSocket startup. App composition can own the hook calls, but mocked lifecycle proof is required. | READY WITH CONSTRAINT |
| Dependency rules can be enforced with the installed lint stack | A missing plugin could block D14 or force package expansion. | Installed ESLint 10 core `no-restricted-imports` schema supports both `group` and `regex` patterns. Flat-config file scopes can block shared-to-feature/app and cross-feature deep imports without adding a plugin. | READY |
| Test centralization can reuse current infrastructure | Moved mocks could leak cache or fail to load aliases. | Vite maps `@/*` to `src/*`, Vitest already loads `src/test/setup.ts`, and current App tests build isolated QueryClients. `render.tsx` can extract this existing pattern; new tests must create a client per render. | READY |
| Production lazy chunk proof can run | Existing TypeScript failures prevent any build/chunk inspection. | Vitest passes 40/40, but lint/build fail on six Dashboard unused symbols. Inspection confirms the settings button/panel and toggle function are commented or unreachable; enabling them would be an unapproved UX change. | READY WITH CONSTRAINT |
| US-FE-001 is the smallest coherent first slice | Splitting it further could leave reverse dependencies or two router/provider sources. | Router composition depends on Auth guard behavior; shared AppShell currently depends on Auth; ProtectedRoute currently owns cross-domain runtime hooks. Moving these boundaries together creates one buildable route/auth outcome while all product features remain behind the explicit migration manifest. | READY |

## Required Constraints

1. **Restore the baseline without adding behavior.** At implementation start,
   remove the three unused icon imports, unused widget-settings state/function,
   and unreachable commented widget-settings markup in Dashboard. Do not enable
   the hidden widget-settings UI. Re-run existing Dashboard/App tests before
   architecture moves.
2. **Complete route coverage.** Extend the route manifest with direct
   `/settings` redirect proof, wildcard redirect proof, query preservation, and
   anonymous direct navigation to representative protected nested routes.
3. **Keep shared domain-neutral.** AppShell must consume account/navigation via
   an app-provided neutral contract. Any `shared -> features` or
   `shared -> app` import fails the story.
4. **Preserve Auth transport initialization.** Add focused tests for access-token
   injection, one retry after 401, refresh failure, and no recursive refresh on
   Auth entry/refresh endpoints.
5. **Prove realtime lifecycle.** App protected runtime must call the four
   existing hooks once per authenticated tree. A mocked StrictMode/navigation/
   logout test must prove no duplicate retained subscription and cleanup.
6. **Keep the migration manifest explicit.** It may reference only unmigrated
   route pages/realtime hooks. Auth and moved shared concerns cannot remain in
   it or under superseded paths.
7. **Inspect production chunks only after clean type checking.** The story does
   not close until lint, type checking, Vite build, route chunks, and static
   boundary scans pass.

## Proof Strategy

Require behavioral and structural evidence together. First freeze the current
route/Auth baseline, then perform the composition cutover, then prove:

- the same browser routes and Auth outcomes;
- one QueryClient/provider boundary and isolated test clients;
- one protected realtime runtime lifecycle;
- actual lazy route chunks rather than eager barrel imports;
- no forbidden dependency or superseded Auth/shared source path.

A green unit suite alone is insufficient for this story.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit / Component | QueryClient factory isolation; provider composition; shared loading/error states; AppShell environment/navigation/collapse/logout; Auth store; Axios callback/retry behavior. |
| Route | Six public paths; 21 navigable protected paths; protected idle/checking/anonymous/authenticated states; Settings index redirect and children; wildcard redirect; Practice query preservation; lazy error boundary. |
| Integration | Live register/verify/login baseline; protected runtime invokes Todo/Habit/Kanban/Pomodoro hook adapters once and cleans up on logout/unmount. |
| E2E | Existing Auth verification flow plus extended data-driven route manifest in Chromium at desktop/tablet; direct refresh on nested/session routes; no lazy/provider/SignalR console error. |
| Platform | ESLint boundaries; TypeScript/build; lazy chunk inspection; zero superseded Auth/shared imports; architecture decision/docs/Harness reconciliation. |
| Visual / Accessibility | Current AppShell/Auth appearance, visible focus, keyboard navigation, loading/error announcement, desktop/tablet route smoke. |

## Fixtures

- Anonymous Auth store.
- Auth store in idle/checking state with controllable `loadMe`.
- Authenticated learner with current avatar/name/email shape.
- Mocked refresh success and failure responses.
- Mocked lifecycle counters for Todo, Habit, Kanban, and Pomodoro sync hooks.
- Route manifest cases generated from the paths currently declared in
  `src/App.tsx`.
- UUID local email account for live registration/verification proof.

## Validation Evidence

Executed during validation on 2026-07-14:

```text
npm --prefix src/frontend run test:run
PASS - 10 files, 40 tests

npm --prefix src/frontend run lint
FAIL - six pre-existing unused-symbol errors in DashboardPage.tsx

npm --prefix src/frontend run build
FAIL - the same six pre-existing TypeScript unused-symbol errors

npm exec -- vitest run src/test/e30-router-validation.probe.test.tsx
PASS - 1 file, 1 test, run from src/frontend; disposable probe removed

npm --prefix src/frontend run test:e2e -- e27-route-manifest.spec.js
PASS - desktop and tablet, 2/2

npm --prefix src/frontend run test:e2e -- auth-email-verification.spec.js
PASS - live local Auth flow, 1/1
```

The first probe invocation was accidentally run from the repository root and
did not load the frontend Vitest config, producing `document is not defined`.
It was rerun from `src/frontend`, loaded JSDOM correctly, and passed. This is an
invocation correction, not a router failure.

The validation Vite process bound to `127.0.0.1:5173` was stopped after proof.
The user's pre-existing IPv6 localhost process was left untouched.

## Implementation Verification Commands

```powershell
npm --prefix src/frontend run lint
npm --prefix src/frontend run test:run
npm --prefix src/frontend run build
npm --prefix src/frontend run test:e2e -- e27-route-manifest.spec.js auth-email-verification.spec.js
rg -n "routes/auth|lib/auth/ProtectedRoute|stores/authStore|lib/api/auth.api|components/AppShell|components/ui|lib/api/client" src/frontend/src
```

Add focused Auth transport, provider isolation, protected runtime lifecycle, and
boundary-rule test filenames to the command list when implementation creates
them. Static scans must distinguish the documented unmigrated manifest from
forbidden completed-slice paths.

## Acceptance Evidence

Implemented and reviewed 2026-07-14:

- Replaced the legacy `BrowserRouter`/`Routes` tree with the application-owned
  `createBrowserRouter` manifest. Auth and feature pages load as route chunks;
  protected routes remain under the same URLs and Settings retains its index
  redirect.
- Moved Auth ownership to `features/auth`, shared UI/layout/http utilities to
  `shared`, and moved the guard/runtime composition to `app`.
- `ProtectedRoute` now owns only session state and navigation. The four
  authenticated SignalR hook adapters run once beneath `ProtectedRuntime`.
- AppShell receives account/logout through a neutral shared environment rather
  than importing Auth. Dashboard's unreachable widget-settings code was
  removed without enabling its hidden UI.
- Added isolated QueryClient/test render factories, accessible lazy-route
  loading/error feedback, Auth transport retry coverage, protected session
  state coverage, AppShell interaction coverage, and a locked expected legacy
  route manifest.
- ESLint blocks shared-to-app/feature imports and feature deep imports inside
  the new architecture. Static closeout found no superseded Auth/shared/router
  paths and no forbidden imports.
- Updated `docs/ARCHITECTURE.md`, decision 0046's canonical shared UI path, and
  accepted decision 0047 for feature-first/data-router ownership.

### Acceptance Matrix

| Acceptance | Evidence | Result |
| --- | --- | --- |
| Data router and route compatibility | Production `createBrowserRouter`/`RouterProvider`; Playwright covers six public routes, direct `/settings`, all protected paths, wildcard redirect, query preservation, and anonymous nested navigation at desktop/tablet. | PASS |
| Auth and transport compatibility | Focused Vitest covers token injection, one 401 refresh/retry, refresh failure token clearing, and no recursive refresh for login/register/refresh. Live register/verify/login Playwright passed. | PASS |
| Provider and cache ownership | One app provider boundary plus fresh QueryClient factory proof; App route tests use isolated clients. | PASS |
| Protected realtime lifecycle | Mocked StrictMode test proves Todo/Habit/Kanban/Pomodoro each retain one active subscription across child navigation and clean to zero on logout. | PASS |
| Shared and feature boundaries | ESLint and static scans found no `shared -> app/features`, no feature deep import in new boundaries, and no superseded Auth/shared source path. | PASS |
| UI and accessibility preservation | AppShell injected navigation/collapse/account/logout test passed; route loading/error and protected checking states announce through status/alert roles; desktop/tablet route proof retained focus, reduced-motion, and overflow checks. | PASS |
| Production lazy chunks | Vite emitted independent Auth and product page chunks including Login, Register, Dashboard, Settings, Flashcards, Practice, Notes, and Workspace. | PASS |
| Documentation and security | Architecture records reconciled; `npm audit --omit=dev` found zero vulnerabilities; scan found no Auth token persistence in local/session storage. | PASS |

Executed 2026-07-14:

```text
npm --prefix src/frontend run lint
PASS

npm --prefix src/frontend run test:run
PASS - 17 files, 55 tests

npm --prefix src/frontend run build
PASS - emitted independent Auth and route chunks

npm --prefix src/frontend run test:e2e -- e27-route-manifest.spec.js auth-email-verification.spec.js
PASS - 3/3 (desktop route manifest, tablet route manifest, live Auth verification flow)

npm --prefix src/frontend audit --omit=dev
PASS - 0 vulnerabilities

focused architecture Vitest
PASS - 6 files, 14 tests (transport, guard, runtime, shell, feedback, manifest)

static superseded-path and dependency-boundary scan
PASS

git diff --check
PASS - line-ending conversion warnings only

.\scripts\bin\harness-cli.exe story verify US-FE-001
PASS - 17 files, 55 tests
```

The Vite build retains the known non-fatal Rolldown annotations from
`@microsoft/signalr`. Review found no P1, P2, or P3 implementation findings.
There is no database migration or backend contract change in this story.

Harness closeout records story `US-FE-001` as implemented with unit,
integration, E2E, and platform proof; accepted decision `0047`; and recorded
detailed high-risk trace `#160` at tier 3/3.
