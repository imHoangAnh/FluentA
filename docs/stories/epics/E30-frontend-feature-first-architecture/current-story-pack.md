# E30 Current Story Pack

## Current Story

- ID: `US-FE-012`
- Title: Notes feature boundary
- Lane: high-risk
- Status: implemented, reviewed, verified, and locally committed on
  2026-07-14

## Objective

Move `/notes`, workspace/editor/assets behavior, and Notes API into
`features/notes` while preserving the Journal public editor boundary.

## Inputs

- `context.md` D1-D17
- `approach.md`
- `story-map.md`
- `US-FE-012-notes-feature-boundary/overview.md`
- `US-FE-012-notes-feature-boundary/design.md`
- `US-FE-012-notes-feature-boundary/validation.md`

## Gate

US-FE-012 must preserve `/notes`, workspace/page/editor/assets behavior,
request payloads, query/cache keys, and Journal's public editor boundary. It
may close only after focused and full tests, browser proof, lint/build,
boundary scans, Harness verification, review evidence, and its own local smart
commit.
