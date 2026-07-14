# E30 Current Story Pack

## Current Story

- ID: `US-FE-011`
- Title: Journal feature boundary
- Lane: high-risk
- Status: implemented, reviewed, verified, and locally committed on
  2026-07-14

## Objective

Move `/journal`, rich-text editor, autosave/search/date UI, and Journal API
into `features/journal` while preserving Dashboard editor preloading.

## Inputs

- `context.md` D1-D17
- `approach.md`
- `story-map.md`
- `US-FE-011-journal-feature-boundary/overview.md`
- `US-FE-011-journal-feature-boundary/design.md`
- `US-FE-011-journal-feature-boundary/validation.md`

## Gate

US-FE-011 must preserve `/journal`, rich-text autosave/search/calendar
behavior, request payloads, query/cache keys, and Dashboard's editor preload.
It may close only after focused and full tests, browser proof, lint/build,
boundary scans, Harness verification, review evidence, and its own local smart
commit.
