# E30 Current Story Pack

## Current Story

- ID: `US-FE-013`
- Title: Pomodoro feature boundary
- Lane: high-risk
- Status: implemented, reviewed, verified, and locally committed on
  2026-07-14

## Objective

Move `/pomodoro`, timer state/API, and realtime synchronization into
`features/pomodoro` while preserving Todo and Kanban public consumers.

## Inputs

- `context.md` D1-D17
- `approach.md`
- `story-map.md`
- `US-FE-013-pomodoro-feature-boundary/overview.md`
- `US-FE-013-pomodoro-feature-boundary/design.md`
- `US-FE-013-pomodoro-feature-boundary/validation.md`

## Gate

US-FE-013 must preserve `/pomodoro`, timer/session payloads, Todo and Kanban
task selection, query/cache keys, and realtime synchronization. It may close
only after focused and full tests, browser proof, lint/build, boundary scans,
Harness verification, review evidence, and its own local smart commit.
