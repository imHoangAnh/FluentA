# 0048 Persistent Protected AppShell Route Layout

Date: 2026-07-16

## Status

Accepted

## Context

FluentA's feature-first data router correctly separates public Auth routes,
session resolution, authenticated realtime startup, and shared presentation.
However, each protected feature page currently renders its own `AppShell`.
Client-side navigation therefore remounts the application chrome, resets local
sidebar state, and relies on every page to remember the same wrapper.

The user approved migrating AppShell to a persistent protected route layout
without changing URLs, feature behavior, authentication, realtime, or visual
design.

## Decision

- Add one pathless AppShell route layout below `ProtectedRuntime` and above all
  protected feature routes.
- Render matched feature pages through the layout's `Outlet`.
- Put static title, description, and content-container metadata on feature
  route handles.
- Keep dynamic page actions inside their owning page rather than in the
  application shell.
- Require every protected content branch to contribute or inherit AppShell
  metadata.
- Keep Auth routes outside ProtectedRoute, ProtectedRuntime, and AppShell.
- Preserve the shared-neutral AppShell environment introduced by decision
  0047.

## Consequences

Positive:

- Sidebar collapse and other shell-local UI state survive protected route
  navigation.
- Application chrome has one route-owned composition point.
- Feature pages contain feature content rather than repeated global layout.
- Missing shell metadata becomes testable in the protected route manifest.

Tradeoffs:

- Feature route objects now carry presentation metadata in addition to path
  and lazy component ownership.
- Dynamic actions need a page-owned top-content slot rather than an AppShell
  prop.
- A protected route added without metadata fails the manifest/layout contract
  until corrected.

## Alternatives Considered

1. Preserve page-owned wrappers and globalize collapse state: rejected because
   it treats remount symptoms while keeping duplicate shell ownership.
2. Register title/actions from mounted pages through effects: rejected because
   it introduces transient stale shell state and effect ordering.
3. Move all page actions into route handles: rejected because feature mutation
   state must not move into app composition.

## Follow-Up

- `US-FE-017` implements and proves the route-layout migration.
- Decision 0047 remains authoritative for feature/shared dependency direction
  and protected runtime ownership.

