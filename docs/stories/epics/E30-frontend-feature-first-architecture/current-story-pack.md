# E30 Current Story Pack

## Current Story

- ID: `US-FE-009`
- Title: Todo feature boundary
- Lane: normal
- Status: implemented, reviewed, verified, and locally committed on
  2026-07-14

## Objective

Move `/todo`, day/week planning UI, Todo API/types, and realtime invalidation
into `features/todo` while preserving Dashboard's public Todo contract.

## Inputs

- `context.md` D1-D17
- `approach.md`
- `story-map.md`
- `US-FE-009-todo-feature-boundary/overview.md`
- `US-FE-009-todo-feature-boundary/design.md`
- `US-FE-009-todo-feature-boundary/validation.md`

## Gate

US-FE-009 must preserve `/todo`, day/week planning, request payloads,
`['todo']` query/cache keys, `refetchType: 'all'` realtime invalidation, and
Dashboard's Todo consumer. It may close only after focused and full tests,
route/browser proof, lint/build, old-path and cross-feature scans, Harness
verification, review evidence, and its own local smart commit.
