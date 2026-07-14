# E30 Current Story Pack

## Current Story

- ID: `US-FE-007`
- Title: Practice feature boundary
- Lane: high-risk
- Status: implemented, reviewed, and verified on 2026-07-14; pending local
  smart commit

## Objective

Move `/practice` and `/practice/:pageId`, their launch modal and session UI,
Practice settings/session endpoint adapter and types, and focused tests into
`features/practice`. Preserve Flashcards as the public deck/session-data
provider and leave Review ownership for US-FE-008.

## Inputs

- `context.md` D1-D17
- `approach.md`
- `story-map.md`
- `US-FE-007-practice-feature-boundary/overview.md`
- `US-FE-007-practice-feature-boundary/design.md`
- `US-FE-007-practice-feature-boundary/validation.md`

## Gate

US-FE-007 must preserve `/practice` URLs, `deck` and `order` navigation,
Practice settings and completion/add-to-review payloads, Flashcards public
data access, speech/session behavior, and responsive deck selection. It may
close only after focused and full tests, route/browser proof, lint/build,
old-path and cross-feature scans, Harness verification, review evidence, and
its own local smart commit.
