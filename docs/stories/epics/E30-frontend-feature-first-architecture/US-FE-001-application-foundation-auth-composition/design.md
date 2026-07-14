# US-FE-001 Design

## Architecture Boundary

The first story changes application composition and completes only the Auth and
shared-foundation ownership slices.

```text
main.tsx
  -> app/providers.tsx
       -> QueryClientProvider
       -> shared AppShell environment provider
       -> Toaster
  -> app/App.tsx
       -> RouterProvider(app/router.tsx)
            |- features/auth/auth.routes.tsx
            `- temporary lazy migration manifest
                 -> existing protected product pages
```

`app` may import feature public APIs and shared code. `features/auth` may import
shared code. `shared` may not import `app`, Auth, or another product feature.

## Application Flow

### Public Auth route

1. `RouterProvider` matches an Auth route from `authRoutes`.
2. React Router lazy-loads the matching page module.
3. The page consumes the Auth public API and shared AuthShell/UI primitives.
4. Existing API endpoint, validation, redirect, and error behavior remains
   unchanged.

### Protected route

1. The data router matches the protected parent route.
2. `app/route-guards/ProtectedRoute.tsx` reads the Auth public state API and
   calls `loadMe` only under the current
   idle/checking rules.
3. Loading and anonymous outcomes remain the current checking state or
   `/login` redirect.
4. An authenticated outcome renders the protected outlet.
5. App-owned protected runtime composition starts each existing realtime hook
   exactly once. Later feature stories replace legacy hook imports with public
   feature APIs.
6. The child route is lazy-loaded from the explicit migration manifest until
   its feature story replaces that entry.

## Router Contract

- Preserve all current paths from `App.tsx`, including nested Settings routes,
  Habit Stats, Flashcard viewer, Practice session, Review, and wildcard return
  to `/`.
- Preserve current query strings such as Practice deck/order selection.
- Auth routes remain outside protected composition.
- Protected routes do not render their page before Auth resolution succeeds.
- Lazy route failures render a shared accessible error boundary without
  changing valid-route behavior.
- Route pending UI uses a shared accessible loading state.

## Shared AppShell Inversion

The shared AppShell remains a layout/presentation component and does not import
the Auth store or feature-owned navigation data.

- Define a domain-neutral shell environment contract in shared code containing
  the current account display data, logout callback, and navigation items.
- `app/providers.tsx` adapts `features/auth` state and app route configuration
  into that contract.
- AppShell keeps its current collapse, active-link, notification link, avatar,
  and logout presentation behavior.
- Shared avatar calculation remains domain-neutral and accepts the account data
  required by the layout.

This inversion removes the current `components/AppShell.tsx -> stores/authStore`
dependency without making Auth depend on AppShell internals.

## Query And Provider Ownership

- `app/query-client.ts` exports the production QueryClient configuration and a
  factory when isolated clients are needed.
- `app/providers.tsx` creates one production cache boundary for the SPA.
- `src/test/render.tsx` creates a fresh QueryClient and memory router for each
  test invocation; tests cannot reuse production cache state.
- Toaster remains inside the application provider tree with unchanged visible
  position/behavior.

## HTTP And Auth Ownership

- Move Axios transport/interceptor behavior to
  `shared/lib/http/client.ts` without changing base URL, token injection,
  refresh deduplication, retry, or error behavior.
- Move Auth endpoints/types to `features/auth/api/auth.api.ts`.
- Move Zustand Auth state to `features/auth/store/auth-store.ts`; keep the
  route guard in app composition rather than inside the Auth feature.
- Preserve the existing transport configuration handshake while avoiding a
  shared-to-feature import. Auth configures shared transport through its public
  bootstrap/store module; shared transport exposes only neutral callbacks.
- Update all remaining legacy API adapters to import the new shared client
  directly. Their domain migration is deferred.

## Test Ownership

- Keep `src/test/setup.ts` as global Vitest setup.
- Add `src/test/render.tsx` as the canonical provider-aware render helper.
- Move App/router tests to `src/test/app` and Auth unit/component tests to
  `src/test/auth`.
- Do not duplicate tests at old and new paths.
- Mocks import Auth through its public API unless the test explicitly verifies
  an Auth-internal module.

## Temporary Migration Manifest

- The manifest contains one named entry per unmigrated route/feature.
- It may import only legacy pages/hooks that have not completed their E30 story.
- A feature story deletes its entries in the same change that adds its exported
  route objects.
- A static assertion records the expected remaining entries, so migration debt
  cannot grow silently.
- `US-FE-016` deletes the manifest and any temporary lint exception.

## Interface Contract

- No backend endpoint, request DTO, response DTO, auth token, cookie, or error
  envelope changes.
- No route URL or browser navigation contract changes.
- No query-key or realtime event-name changes.
- New TypeScript public APIs are internal frontend module contracts only.

## Data Model

No database, persistence, migration, or retention change.

## UI And Platform Impact

- Current E27 visual output remains the reference.
- Route modules become lazy chunks, so loading/error states must be accessible
  and non-disruptive.
- Chrome and Edge remain blocking browser targets under the accepted frontend
  presentation decision.
- Build output is inspected for accidental eager import of all feature pages.

## Observability

- Browser console must contain no lazy-route, duplicate-key, provider, or
  SignalR lifecycle error during route-manifest proof.
- Network proof confirms Auth refresh/login requests remain unchanged.
- Build output records route chunking and any size warning.

## Alternatives Considered

1. Keep `BrowserRouter` and introduce feature folders first: rejected because
   D5 and D6 require the data-router/lazy composition boundary.
2. Move AppShell to shared unchanged: rejected because it would make shared
   depend on Auth.
3. Put realtime startup in Auth: rejected because Todo/Habit/Kanban/Pomodoro
   side effects are not authentication responsibilities.
4. Migrate every feature route in this story: rejected because it recreates a
   one-shot rewrite and eliminates rollback checkpoints.
5. Keep the old `App.tsx` as a permanent compatibility router: rejected; the
   migration manifest is explicit, shrinking, and deleted at closeout.
