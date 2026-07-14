# US-FE-003 Overview

## Status

Implemented and reviewed: 2026-07-14.

## Current Behavior

`/settings` is a protected legacy route with Profile, Practice, Review, and
Level 5 child routes. The Profile page owns avatar upload/list/delete and
profile-save behavior; the other pages preserve their existing Practice,
Review, and Level 5 query and mutation contracts.

## Target Behavior

All Settings routes and Settings-owned profile composition move to
`features/settings`, which exports its lazy route objects through its public
index. The existing URLs, UI, query keys, payloads, and save behavior remain
unchanged. Practice and Review calls are consumed through narrow public APIs,
without moving their broader feature ownership early.

## Relevant Product Docs

- `docs/product/authentication.md`
- `docs/product/assets.md`
- `docs/product/learning-workflows.md`

## Acceptance Criteria

1. `/settings/profile`, `/settings/practice`, `/settings/review`, and
   `/settings/level5` remain protected, lazy, and reachable through
   `features/settings`.
2. Profile/avatar queries, uploads, deletes, payloads, cache updates, and Auth
   user synchronization are unchanged.
3. Practice, Review, and Level 5 keep their existing query keys, endpoints,
   mutation/cache behavior, explicit-save workflow, and UI.
4. No Settings route/UI/API source remains under `src/routes/settings` or the
   Settings entry in `app/legacy-routes.tsx`.
5. Settings has no cross-feature deep imports; its public index exports only
   supported Settings contracts.

## Non-Goals

- Moving the complete Practice, Review, Assets, or Auth feature ownership.
- Changing API contracts, auth/session behavior, storage, backend code, or
  database schemas.
- Any Settings visual redesign or change to route URLs.
