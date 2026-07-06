# Overview

## Current Behavior

After `US-BC-005`, the backend only serves Practice and Review through their
owned endpoint families:

- Practice -> `/api/v1/practice/*`
- Review -> `/api/v1/review/*`
- Flashcard read models -> `/api/v1/flashcards/*`

The frontend still had a mixed contract in several places:

- `flashcard.api.ts` still posted practice summaries to
  `/api/v1/flashcards/practice-sessions`
- dashboard requests still used `/api/v1/flashcards/dashboard`
- cache ownership in React Query still used mixed `flashcard` settings and
  dashboard keys for Practice and Review concerns
- focused Playwright specs still referenced removed `/flashcards/*` Practice
  and Review routes
- review SQL seed helpers still referenced legacy public-table names instead of
  the new owned schemas

## Target Behavior

Frontend route consumers, API clients, cache ownership, and focused test
surfaces should align with the bounded-context split:

- Flashcard client functions remain only for deck/card reads.
- Practice client calls use `/api/v1/practice/*`.
- Review client calls use `/api/v1/review/*`.
- Practice settings cache uses a Practice-owned query key.
- Review settings and dashboard cache use Review-owned query keys.
- Focused frontend proof no longer references removed mixed backend routes.

## Affected Users

- Frontend maintainers updating learning clients after the backend cutover.
- Reviewers validating that no active frontend surface still depends on the
  removed mixed API routes.

## Affected Product Docs

- `SPEC.md` Section 20
- `docs/stories/epics/backend-bounded-context-split/epic-map.md`
- `docs/stories/epics/backend-bounded-context-split/US-BC-001-contract-and-ownership-map/contract-map.md`

## Non-Goals

- Backend service or controller changes.
- Vocabulary sync ownership work.
- Behavior redesign of Practice or Review UX.
- Fixing every stale historical Playwright locator unrelated to endpoint
  ownership.
