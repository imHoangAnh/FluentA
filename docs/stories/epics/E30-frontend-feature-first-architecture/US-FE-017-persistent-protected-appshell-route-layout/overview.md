# US-FE-017 Overview

## Status

- Lane: high-risk
- Approval: approved by the user on 2026-07-16
- Intake: `#90`
- Harness story: `US-FE-017`
- Readiness: ready with constraints

## Current Behavior

The protected data-router branch owns session resolution and authenticated
realtime startup, but every protected page renders its own `AppShell`. Moving
between two protected pages therefore unmounts the old shell and mounts a new
one. Shell-local state such as sidebar collapse is reset, and each page must
remember to provide the shared application chrome.

The worktree already contains unrelated user edits in `ProtectedRoute`,
`AuthShell`, Dashboard content, and shared route feedback. Those edits are not
part of this story and must be preserved.

## Target Behavior

- One pathless protected route layout owns the single mounted `AppShell`.
- All protected feature routes render through the shell layout's `Outlet`.
- Static shell presentation metadata such as title, description, and content
  width is declared on feature route objects.
- Page-specific actions remain owned by their pages.
- Sidebar collapse state survives navigation between protected routes.
- Public Auth routes remain outside protected runtime and AppShell composition.
- Existing URLs, route lazy loading, auth behavior, realtime hooks, API calls,
  query keys, and visible page presentation remain unchanged.

## Affected Users

- Authenticated FluentA users navigating between product areas.
- Frontend contributors adding or maintaining protected feature routes.

## Affected Product Docs

- `docs/product/authentication.md`
- `docs/ARCHITECTURE.md`
- `docs/decisions/0048-persistent-protected-appshell-route-layout.md`

## Non-Goals

- Redesigning the sidebar, page content, AuthShell, or protected loading UI.
- Changing authentication, refresh, logout, or authorization behavior.
- Changing backend APIs, schemas, query keys, or realtime contracts.
- Moving the shell environment provider or rewriting feature route ownership.

