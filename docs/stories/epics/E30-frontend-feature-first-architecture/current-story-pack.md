# E30 Current Story Pack

## Current Story

- ID: `US-FE-010`
- Title: Kanban feature boundary
- Lane: high-risk
- Status: implemented, reviewed, verified, and locally committed on
  2026-07-14

## Objective

Move `/kanban`, board/column/card UI, Kanban API/types, and realtime
invalidation into `features/kanban` while preserving Pomodoro's public Kanban
contract.

## Inputs

- `context.md` D1-D17
- `approach.md`
- `story-map.md`
- `US-FE-010-kanban-feature-boundary/overview.md`
- `US-FE-010-kanban-feature-boundary/design.md`
- `US-FE-010-kanban-feature-boundary/validation.md`

## Gate

US-FE-010 must preserve `/kanban`, board/column/card operations, request
payloads, `['kanban']` query/cache keys, `refetchType: 'all'` realtime
invalidation, and Pomodoro's Kanban consumer. It may close only after focused
and full tests, browser proof, lint/build, old-path and cross-feature scans,
Harness verification, review evidence, and its own local smart commit.
