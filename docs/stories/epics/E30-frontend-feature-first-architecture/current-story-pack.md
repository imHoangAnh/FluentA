# E30 Current Story Pack

## Current Story

- ID: `US-FE-005`
- Title: Vocabulary feature boundary
- Lane: high-risk
- Status: implemented, reviewed, and verified on 2026-07-14; pending local smart commit

## Objective

Move the protected Vocabulary route, workspace/table components, adapter and
types, and tests into `features/vocabulary`; expose its lazy route through the
public API and remove the Vocabulary legacy manifest entry without changing
board/page CRUD, autosave, fixed-column preferences, cache keys, or realtime.

## Inputs

- `context.md` D1-D17
- `approach.md`
- `story-map.md`
- `US-FE-005-vocabulary-feature-boundary/overview.md`
- `US-FE-005-vocabulary-feature-boundary/design.md`
- `US-FE-005-vocabulary-feature-boundary/validation.md`

## Gate

US-FE-005 is high-risk because it owns board/page CRUD, spreadsheet autosave,
preference persistence, and Vocabulary-to-Flashcard synchronization. It may
close only after focused and full tests, API-backed browser proof, lint/build,
legacy-path and cross-feature scans, Harness verification, review evidence,
and its own local smart commit.
