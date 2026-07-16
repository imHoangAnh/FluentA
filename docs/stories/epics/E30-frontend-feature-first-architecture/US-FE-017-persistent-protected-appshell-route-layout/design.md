# US-FE-017 Design

## Domain Model

No backend or persisted domain model changes. The story changes only frontend
route composition and presentation ownership.

## Application Flow

```text
RouterProvider
  -> ProtectedRoute
       -> ProtectedRuntime
            -> AppShellRouteLayout
                 -> AppShell
                      -> Outlet
                           -> matched feature page
```

`AppShellRouteLayout` reads the deepest matched route handle that contributes
AppShell metadata. Settings declares metadata on its parent route so all nested
Settings pages inherit the same shell presentation. The AppShell layout route
does not change while navigating between protected feature routes, so its local
collapse state remains mounted.

Dynamic page actions stay inside the matched page and render at the same top
content position. This prevents the persistent application shell from owning
feature mutation state.

## Interface Contract

- Preserve every current public and protected URL.
- Preserve route-level lazy loading and the wildcard redirect.
- Add an internal frontend route-handle contract:
  - `title: string`
  - optional `description: string`
  - optional `contentClassName: string`
- Every protected content branch must contribute or inherit this handle.
- Auth routes do not receive AppShell metadata and remain outside the protected
  branch.

## Data Model

No database, storage, migration, or retention change.

## UI / Platform Impact

- The sidebar, account, notifications, main container, responsive widths, and
  hidden accessible route heading keep their current output.
- Sidebar collapse becomes persistent across protected client-side navigation.
- Route-specific full-width/full-height content classes continue to update
  from the active route handle.
- Chrome and Edge remain the blocking browser targets already accepted for the
  frontend.

## Observability

- Unit coverage proves shell state persistence and metadata updates across a
  route transition.
- Static scans prove feature pages no longer import or render `AppShell`.
- Existing protected runtime lifecycle tests prove realtime hooks still start
  once at the same parent boundary.
- Build output and route tests detect lazy-module or composition failures.

## Alternatives Considered

1. Keep page-owned AppShell wrappers: rejected because shell state remounts and
   new pages can omit the shared chrome.
2. Move shell state into Zustand while keeping page wrappers: rejected because
   it preserves duplicate shell ownership and globalizes component-local UI
   state unnecessarily.
3. Let pages register shell props through effects: rejected because route
   handles provide deterministic metadata before page effects run.
4. Put page mutations in route handles: rejected because dynamic actions must
   stay inside their owning feature page.

