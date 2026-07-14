# 0047 Frontend Feature-First And Data Router Boundary

Date: 2026-07-14

## Status

Accepted

## Context

The React SPA previously centralized routing, domain pages, shared UI, API
adapters, authentication, and realtime startup under root `App.tsx`, `routes`,
`components`, and `lib` folders. That layout made ownership unclear and allowed
shared presentation code to depend directly on Auth and product navigation.

The application must migrate without changing public URLs, backend contracts,
query keys, realtime events, or the shipped E27 user experience.

## Decision

- Use `src/app` as the only application-composition boundary. It owns
  `RouterProvider`, the data router, providers, route guards, navigation data,
  and authenticated runtime composition.
- Use `src/features/<domain>` for domain-owned API, state, UI, route objects,
  and realtime adapters. Other boundaries import a feature only through its
  public `index.ts`.
- Use `src/shared` only for domain-neutral UI, layout, feedback, types, and
  infrastructure. Shared code cannot import app or feature code.
- Use React Router data route objects with lazy page modules. Auth exports its
  route objects; unmigrated domains remain in the named, shrinking
  `app/legacy-routes.tsx` manifest.
- Keep authenticated side effects under `app/runtime/ProtectedRuntime.tsx`
  until their owning features migrate. The Auth guard only resolves session
  state and access.
- Keep Axios transport in shared code. Auth configures it through neutral token
  and refresh callbacks, preserving in-memory access-token ownership.
- Centralize unit/component test infrastructure under `src/test`; keep
  Playwright tests under `src/frontend/e2e`.
- Enforce shared neutrality and feature public-import boundaries with ESLint.

## Consequences

Positive:

- Route and provider ownership is explicit, while product URLs and behavior
  remain stable.
- Auth and AppShell no longer create reverse dependencies.
- Lazy route chunks provide an observable migration and loading boundary.
- Each feature can move independently with a buildable rollback checkpoint.

Tradeoffs:

- `app/legacy-routes.tsx` temporarily imports legacy route modules and
  `ProtectedRuntime` temporarily imports legacy realtime hooks.
- The repository contains both feature-first and legacy domain paths until E30
  finishes; later stories must shrink, not extend, this seam.

## Follow-Up

- `US-FE-002` through `US-FE-015` move the remaining product domains behind
  feature public APIs.
- `US-FE-016` removes the legacy route/runtime seam and proves the final
  dependency graph.
