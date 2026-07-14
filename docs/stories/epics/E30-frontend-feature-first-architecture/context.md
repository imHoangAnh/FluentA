# E30 Frontend Feature-First Architecture Context

## Status

- Phase: exploration complete
- Approval: approved by the user on 2026-07-14
- Intake class: frontend architecture migration initiative
- Scope: frontend-only, incremental feature-first migration
- Risk direction: high because the migration crosses every frontend route and
  module boundary, while preserving existing runtime contracts

## Intent

Migrate `src/frontend/src` from centralized route, component, and library
folders to a feature-first architecture. Each product domain owns its routes,
pages, components, API adapter, hooks, realtime subscription logic, and public
exports. Application composition and genuinely shared infrastructure remain
outside the feature folders.

The migration is performed incrementally so the frontend remains buildable and
testable after every slice. This initiative changes code organization and
internal ownership; it does not redesign product behavior.

## Existing Behavior And Constraints

- `src/frontend/src/App.tsx` currently owns the route manifest centrally.
- `src/frontend/src/main.tsx` currently constructs the query client, router,
  and application-level providers.
- Product pages are primarily centralized under `routes/`.
- `components/` mixes application-wide primitives with domain components.
- `lib/api/` contains shared HTTP infrastructure and domain API adapters.
- Protected routing currently lives under `lib/auth/ProtectedRoute.tsx`.
- The frontend uses React 19, TypeScript, Vite, React Router, TanStack Query,
  Zustand, Tailwind/design tokens, CSS Modules, Axios, and SignalR.
- Unit and component tests are currently partly colocated. Playwright tests
  live under `src/frontend/e2e`.
- Existing routes, backend contracts, query behavior, realtime behavior, and
  user workflows must remain available throughout the migration.

## Target Ownership Shape

```text
src/frontend/src/
|- app/                 application composition, router, providers, guards
|- features/            product-domain modules and their public APIs
|  |- auth/
|  |- dashboard/
|  |- vocabulary/
|  |- flashcards/
|  |- practice/
|  |- review/
|  |- habits/
|  |- todo/
|  |- journal/
|  |- notes/
|  |- kanban/
|  |- pomodoro/
|  |- countdown/
|  |- settings/
|  `- notifications/
|- shared/              domain-neutral UI, layout, feedback, and infrastructure
|- styles/              global tokens, reset/base styles, true global utilities
|- assets/
|- test/                centralized unit/component test tree and test helpers
`- main.tsx              browser entry point only
```

Directories are created only when they contain real production or test files.
The target tree is an ownership model, not a requirement to add empty folders.

## Locked Decisions

- **D1 - Full frontend migration.** Migrate the entire frontend to the approved
  feature-first model. Internal frontend logic may be refactored as needed,
  but backend APIs, database schemas, and backend domain architecture are
  excluded without separate approval.
- **D2 - Incremental cutover.** Migrate feature by feature. Every completed
  slice must leave the frontend buildable and testable.
- **D3 - Practice and Review are separate features.** Use
  `features/practice` and `features/review` rather than nesting Review inside
  Practice. Their current product and backend bounded contexts remain distinct.
- **D4 - No empty skeleton.** Create a target directory only when a real file
  is ready to move into it. Do not add `.gitkeep` placeholders for the proposed
  tree.
- **D5 - Data router composition.** Adopt `createBrowserRouter` and
  `RouterProvider`. Each feature exports `RouteObject[]`; `app/router.tsx`
  aggregates those route objects.
- **D6 - Route-level lazy loading.** Lazy-load feature/page routes and provide
  shared loading and error boundaries.
- **D7 - Public feature APIs.** Each feature exposes supported imports through
  its `index.ts`. Cross-feature consumers import `@/features/<feature>` and
  must not deep-import another feature's internal files.
- **D8 - API ownership follows the endpoint domain.** Practice owns
  `/practice/*`; Review owns `/review/*`. Settings composes public feature APIs
  where necessary instead of duplicating domain API clients.
- **D9 - Centralized unit/component tests.** Place unit and component tests
  under `src/frontend/src/test`, organized by feature. Keep Playwright E2E
  tests under `src/frontend/e2e`.
- **D10 - Hybrid styling with an explicit default.** Keep Tailwind and design
  tokens as the default. Retain or introduce CSS Modules only for complex UI
  such as tables, editors, or interactive learning sessions. Do not perform a
  bulk styling conversion as part of this architecture migration.
- **D11 - No long-lived compatibility paths.** Within each migration slice,
  update all consumers and delete the old files/exports before closing the
  slice. A temporary re-export is allowed only while that same slice is in
  progress.
- **D12 - Domain-ordered migration phases.** Organize execution into
  Foundation; Platform and Identity; Learning; Planning; Writing; Focus and
  Time; Habit Tracking; and Final Cleanup. Features remain independent
  checkpoints inside each phase.
- **D13 - Preserve product contracts.** Keep current route URLs, API payloads,
  query/cache behavior, realtime behavior, and user workflows. Product or UX
  changes require a separate approved story.
- **D14 - Enforced import boundaries.** Add automated lint/validation rules:
  `app` may compose features and shared code; features may depend on shared;
  shared may not depend on app or features; cross-feature imports must use the
  target feature's public API.
- **D15 - Shared code requires demonstrated reuse.** Code used by one feature
  remains in that feature. Move domain-neutral code into `shared` only when it
  is application infrastructure, global layout/feedback, a UI primitive, or is
  genuinely reused across independent features.
- **D16 - State ownership follows state lifetime.** TanStack Query owns server
  state; local component state stays local; feature session logic belongs in
  feature hooks. Zustand is reserved for persistent or application-wide client
  state and is not a mandatory store per feature.
- **D17 - Realtime infrastructure is shared, domain subscriptions are not.**
  `shared/lib/realtime/connection.ts` creates/configures connections. Feature
  realtime hooks own domain events, subscriptions, and query invalidation.

## Migration Phases

1. **Foundation:** `app`, `shared`, router, providers, query-client ownership,
   and test utilities.
2. **Platform and Identity:** Auth, AppShell, Dashboard, Settings, and
   Notifications.
3. **Learning:** Vocabulary, Flashcards, Practice, and Review, migrated and
   verified one feature at a time.
4. **Planning:** Todo and Kanban.
5. **Writing:** Journal and Notes.
6. **Focus and Time:** Pomodoro and Countdown.
7. **Habit Tracking:** Habits.
8. **Final Cleanup:** Remove superseded centralized paths, enforce dependency
   boundaries, reconcile documentation, and run full frontend regression proof.

## Explicit Exclusions

- Backend endpoint, payload, schema, persistence, or domain-model changes.
- Product feature additions or visual redesigns hidden inside the migration.
- Route URL changes or compatibility removals unrelated to moving ownership.
- A bulk Tailwind-to-CSS-Modules or CSS-Modules-to-Tailwind rewrite.
- Empty target folders created only to match an aspirational tree.
- Permanent compatibility barrels that preserve the old architecture.
- Moving all feature state into Zustand or all realtime behavior into one
  global hook.

## Acceptance Direction

- Every existing protected and public frontend route remains reachable with
  its accepted behavior.
- Each completed feature owns its routes, UI, API adapter, hooks, realtime
  behavior, types, and public exports where those concerns exist.
- `app` composes the application; `shared` remains domain-neutral; features do
  not deep-import one another.
- Unit/component tests live under `src/frontend/src/test`; E2E tests remain
  under `src/frontend/e2e`.
- No completed slice retains its superseded route/component/API path.
- Import-boundary checks, focused tests, lint/type checking, and production
  build run at appropriate slice boundaries.
- Final regression proof covers route reachability and representative behavior
  across every migrated domain.

## Deferred To Planning

- Exact story count and Harness identifiers inside each migration phase.
- The current-file-to-target-file inventory and dependency graph for every
  feature.
- The precise router cutover sequence that avoids parallel route manifests.
- Lazy-route loading/error component implementation details.
- ESLint rule/plugin choice and any narrow test/config exemptions.
- Per-slice test selection, rollback checkpoints, and final release-proof
  matrix.
- Documentation updates required as each architectural boundary becomes live.

## Affected Contracts

- `docs/ARCHITECTURE.md` must be updated as ownership boundaries become live.
- `docs/HARNESS.md` and story/Harness records govern planning, validation, and
  release proof.
- Existing behavior in `docs/product/` is preserved. A product document should
  change only if planning discovers stale architecture wording; behavior
  changes are outside E30.
