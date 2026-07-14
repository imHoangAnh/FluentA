# US-FE-001 Overview

## Current Behavior

- `src/App.tsx` synchronously imports and owns every route through JSX
  `<Routes>`/`<Route>` declarations.
- `src/main.tsx` creates the QueryClient and composes BrowserRouter, Query, and
  toast providers inline.
- Auth pages live under `routes/auth`, Auth API under `lib/api`, the Zustand
  store under `stores`, and `ProtectedRoute` under `lib/auth`.
- `ProtectedRoute` both checks the session and starts Todo, Habit, Kanban, and
  Pomodoro realtime hooks.
- AppShell lives in the generic component folder but directly imports the Auth
  store, so moving it unchanged into `shared` would create a forbidden shared
  to feature dependency.
- Shared UI, HTTP, language/avatar helpers, tests, and domain files are mixed
  under centralized folders.
- Vitest currently passes 40/40. Lint and production build currently fail on
  six unused symbols in `DashboardPage.tsx`; this baseline defect must be
  resolved without changing Dashboard behavior before story proof is accepted.

## Target Behavior

- The browser boots through `app/App.tsx`, `app/router.tsx`,
  `app/providers.tsx`, and `app/query-client.ts` using
  `createBrowserRouter`/`RouterProvider`.
- Public Auth routes are lazy feature routes exported by `features/auth`.
- Protected session checking remains identical under
  `app/route-guards/ProtectedRoute.tsx`, while application-wide realtime
  startup no longer belongs to that guard.
- Domain-neutral UI, AppShell presentation, feedback states, Axios transport,
  avatar/language/utils, and global styles have canonical shared owners.
- AppShell account and navigation behavior are injected through a
  domain-neutral contract so `shared` imports no feature.
- Unmigrated product routes remain reachable through an explicit lazy migration
  manifest that later stories shrink.
- Unit/component test infrastructure lives under `src/test`, provides isolated
  QueryClient/router renders, and Auth/App route tests use the new public APIs.
- Current route paths, redirects, query parameters, user flows, API requests,
  cache semantics, and presentation remain unchanged.

## Affected Users

- Anonymous users using login, registration, email verification, password
  reset, or Google callback routes.
- Authenticated users loading or refreshing any protected FluentA route.
- Frontend contributors who add routes, providers, shared UI, or feature code.

## Affected Product Docs

- `docs/product/authentication.md`
- `docs/ARCHITECTURE.md`
- Product behavior in all other `docs/product/` files is regression scope but
  is not changed by this story.

## Non-Goals

- Migrating Dashboard, Settings, Notifications, or any other product feature's
  internal page/component/API ownership.
- Changing route URLs, redirects, auth tokens, refresh behavior, backend APIs,
  query keys, or realtime event contracts.
- Redesigning Auth, AppShell, loading states, or protected pages.
- Enforcing zero legacy paths globally before their feature stories.
- Creating empty feature/shared folders or long-lived compatibility exports.
