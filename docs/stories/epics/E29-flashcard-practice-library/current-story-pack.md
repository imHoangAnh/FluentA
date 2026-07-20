# E29 Current Story Pack

## Current Story

- ID: `US-PRACTICE-002`
- Title: Full-width learning library and modal-first Practice launch
- Lane: normal
- Status: implemented - review evidence recorded; live API/database regression
  remains unavailable because PostgreSQL is not listening locally

The 2026-07-21 frontend-only follow-up makes Flashcards use the same compact
10/7/2/1 responsive deck presentation as Practice. Viewer navigation, modal
launch, and empty-deck behavior are preserved.

## Objective

Replace the legacy Practice routes and duplicated setup with the approved
full-width shared learning library, query-driven preparation dialog, and
URL-stable direct session start while preserving existing Practice, summary,
SRS, and API contracts.

## Inputs

- `context.md` D1-D16
- `approach.md`
- `story-map.md`
- `US-PRACTICE-002-library-route-modal-launch/overview.md`
- `US-PRACTICE-002-library-route-modal-launch/design.md`
- `US-PRACTICE-002-library-route-modal-launch/validation.md`

## Gate

Implementation was approved and completed on 2026-07-14. The focused mocked
Chromium suite proves the new frontend journey; rerun the API-backed Practice
workflow when PostgreSQL and the API runtime are available.
