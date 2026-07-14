# US-FE-002 Overview

## Status

Implemented and reviewed: 2026-07-14.

## Story Outcome

Move the authenticated home route and Dashboard UI from the legacy route tree
into `features/dashboard`, expose its lazy route objects through the Dashboard
public API, and remove the Dashboard entry from the temporary legacy manifest
without changing current Dashboard behavior.

## Current Behavior

- `/` is the protected index route and lazy-loads
  `routes/dashboard/DashboardPage.tsx` through `app/legacy-routes.tsx`.
- Dashboard reads the current Auth user through the Auth public API.
- Dashboard composes existing Todo, Habit, Countdown, and Review data and
  existing Todo/Habit quick-toggle mutations.
- Dashboard preloads the legacy Journal rich-text editor after mount.
- Current accepted AppShell title is `Overview`; several older Playwright
  assertions still expect `Dashboard Overview`.
- The source currently renders only the nearest Countdown (`slice(0, 1)`),
  while `docs/product/personal-productivity.md` still describes up to three.

## Target Behavior

- `/` is exported by `features/dashboard/dashboard.routes.tsx` and remains the
  protected lazy index route.
- Dashboard source lives under `features/dashboard/pages` and its focused
  unit/component tests live under `src/test/dashboard`.
- `app/router.tsx` composes `dashboardRoutes` through
  `@/features/dashboard`; `app/legacy-routes.tsx` no longer contains Dashboard.
- Greeting, date/time refresh, loading skeletons, empty/data states, query
  keys, API calls, quick toggles, navigation, AppShell presentation, and
  Journal preloading remain unchanged.
- Browser proof uses the currently shipped `Overview` title without changing
  the user interface.

## Acceptance Criteria

1. Authenticated `/` resolves through the Dashboard feature public route API,
   while anonymous access still redirects through the existing protected
   composition.
2. Dashboard keeps the exact query keys and endpoint calls for Todo, Habit,
   Countdown, and Review, including the current local date/timezone behavior.
3. Todo and Habit quick toggles keep their current mutation and domain-cache
   invalidation behavior.
4. Loading, empty, populated, navigation, responsive, and accessible-name
   behavior remains observable with focused Vitest and Chromium proof.
5. No Dashboard source or Dashboard route entry remains under
   `src/routes/dashboard` or `app/legacy-routes.tsx`.
6. Cross-feature consumers import Dashboard only from
   `@/features/dashboard`; the public index exports only supported contracts.
7. Frontend lint, tests, production build/lazy chunk inspection, focused
   Dashboard E2E, route manifest proof, and structural scans pass.

## Dependencies

- `US-FE-001` implemented with all four proof lanes and story verification
  passing.
- E30 decisions D1-D17 and accepted decision 0047.
- Existing Dashboard product behavior in
  `docs/product/personal-productivity.md` and the accepted E27 presentation
  boundary.

## Non-Goals

- Migrating Todo, Habit, Countdown, Review/Flashcard, or Journal ownership.
- Creating a Dashboard backend endpoint, schema, cache key, or Zustand store.
- Extracting new generic widgets/components solely to populate the proposed
  folder tree.
- Restoring widget-visibility settings or changing Dashboard copy/layout.
- Resolving the existing one-versus-three Countdown product-doc drift.
- Changing query refresh, mutation, realtime, API, or persistence contracts.
