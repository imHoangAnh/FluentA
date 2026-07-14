# US-FE-005 — Vocabulary feature boundary

## Objective

Make `features/vocabulary` the only frontend owner of `/vocabulary`, its
workspace, table and preference UI, Vocabulary API/types, and focused tests.
The route URL, API payloads, React Query keys, board/page/word behavior,
autosave behavior, realtime behavior, and user experience remain unchanged.

## Acceptance criteria

- `/vocabulary` is supplied by `features/vocabulary/vocabulary.routes.tsx`
  through the feature public API.
- Workspace, table, column settings, delete confirmation, API/types, and
  focused tests have canonical Vocabulary ownership.
- The legacy route manifest contains no Vocabulary route and no active source
  imports the old route/component/API paths.
- Existing board/page/word CRUD, fixed-column preferences, keyboard autosave,
  retry behavior, and delete confirmation remain proven end-to-end.

## Scope boundary

No backend, API contract, database schema, cache-key, realtime, route URL, or
product UX changes are authorized. The updated Playwright assertions replace
obsolete selectors for pre-existing UI that had already moved from inline page
editing/custom columns to fixed-column settings and context-menu deletion.
