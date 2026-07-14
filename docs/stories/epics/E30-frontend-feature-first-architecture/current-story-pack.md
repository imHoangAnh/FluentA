# E30 Current Story Pack

## Current Story

- ID: `US-FE-008`
- Title: Review feature boundary
- Lane: high-risk
- Status: implemented, reviewed, and verified on 2026-07-14; pending local
  smart commit

## Objective

Move `/review`, its session UI, Review settings/session/dashboard adapter and
types, and focused tests into `features/review`. Preserve Flashcards as the
public board-data provider and update Dashboard to consume Review publicly.

## Inputs

- `context.md` D1-D17
- `approach.md`
- `story-map.md`
- `US-FE-008-review-feature-boundary/overview.md`
- `US-FE-008-review-feature-boundary/design.md`
- `US-FE-008-review-feature-boundary/validation.md`

## Gate

US-FE-008 must preserve `/review`, Review settings/session/dashboard payloads,
Flashcards public board data, query keys, speech/session behavior, and the
Dashboard review queue. It may close only after focused and full tests,
route/browser proof, lint/build, old-path and cross-feature scans, Harness
verification, review evidence, and its own local smart commit.
