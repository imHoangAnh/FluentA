# E30 Current Story Pack

## Current Story

- ID: `US-FE-006`
- Title: Flashcards feature boundary
- Lane: normal
- Status: implemented, reviewed, and verified on 2026-07-14; pending local smart commit

## Objective

Move `/flashcards` and `/flashcards/pages/:pageId`, their deck library/viewer,
Flashcard endpoint subset, realtime subscription, types, and focused tests into
`features/flashcards`. Preserve the `/practice` route as a temporary public-API
consumer until its own US-FE-007 boundary migration.

## Inputs

- `context.md` D1-D17
- `approach.md`
- `story-map.md`
- `US-FE-006-flashcards-feature-boundary/overview.md`
- `US-FE-006-flashcards-feature-boundary/design.md`
- `US-FE-006-flashcards-feature-boundary/validation.md`

## Gate

US-FE-006 must preserve `flashcard` query keys, deck/session endpoints, the
FlashcardDeckUpdated invalidation behavior, viewer navigation, and the
temporary Practice library workflow. It may close only after focused and full
tests, route/browser proof, lint/build, old-path and cross-feature scans,
Harness verification, review evidence, and its own local smart commit.
