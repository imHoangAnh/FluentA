# E30 Current Story Pack

## Current Story

- ID: `US-FE-017`
- Title: Persistent protected AppShell route layout
- Lane: high-risk
- Status: implemented, reviewed, and verified on 2026-07-16; not committed

## Objective

Move AppShell from page-owned wrappers to one persistent protected route layout
without changing URLs, visible page behavior, auth, queries, or realtime.

## Inputs

- `context.md` D1-D17
- `approach.md`
- `story-map.md`
- `US-FE-017-persistent-protected-appshell-route-layout/overview.md`
- `US-FE-017-persistent-protected-appshell-route-layout/design.md`
- `US-FE-017-persistent-protected-appshell-route-layout/execplan.md`
- `US-FE-017-persistent-protected-appshell-route-layout/validation.md`

## Gate

US-FE-017 leaves one mounted AppShell for protected navigation, preserves the
approved route/UI/API/query/realtime contracts, and keeps unrelated worktree
changes intact. Full-suite failures from those pre-existing user edits remain
documented in the story validation.
