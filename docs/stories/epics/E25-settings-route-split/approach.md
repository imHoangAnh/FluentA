# Approach: Settings Route Split

## Recommended Work Shape

Mode: `standard_feature`

Why smaller modes are insufficient:

- The feature changes protected route registration, the primary Settings
  layout, and the save semantics of existing Practice/Review forms.
- The work spans four user-visible settings surfaces plus product docs and
  focused regression coverage.
- Level 5 must be moved into the shared shell without changing its behavior,
  which makes this larger than a local 1-3 file UI cleanup.

Use an epic map and validate the route-shell story first before execution
beads. Do not start implementation until the route split, manual-save cutover,
and doc/test boundaries are approved.

## Recommended Sequence

1. Introduce a shared desktop settings shell with sidebar navigation and route
   outlet ownership.
2. Register `/settings/profile`, `/settings/practice`, `/settings/review`, and
   `/settings/level5`, then redirect `/settings` to `/settings/profile`.
3. Move the current profile flow into the new profile route without changing
   profile/avatar API semantics.
4. Convert Practice settings from autosave to draft-plus-explicit-save on the
   dedicated practice route.
5. Convert Review settings from autosave to draft-plus-explicit-save on the
   dedicated review route.
6. Move Level 5 into the shared shell while preserving filters, search,
   remove, and bulk remove behavior.
7. Refresh product docs and focused frontend/browser proof to the split-route
   contract.
8. Apply the approved Settings workspace redesign as `US-SETTINGS-005`, using
   existing shared primitives and preserving the route/API/manual-save
   contracts completed by the earlier stories.

## Rejected Alternatives

1. Keep one `/settings` page and only restyle it like Level 5.
   Rejected because the locked contract requires separate second-level routes.
2. Reuse the older `ReviewSettingsPage.tsx` as-is.
   Rejected because it still combines Practice and Review together and does not
   provide the shared shell required by Feature 24.
3. Keep Practice/Review autosave and only add save buttons visually.
   Rejected because the locked contract explicitly removes autosave behavior in
   this feature.

## Risk Map

| Component | Risk | Reason | Proof Needed |
| --- | --- | --- | --- |
| Route registration | MEDIUM | `/settings` default behavior changes and old route assumptions may linger in the router or tests. | Router test/update plus focused browser proof for redirect and protected second-level routes. |
| Shared shell extraction | MEDIUM | Moving four screens under one shell can accidentally break header/logout affordances or active-nav state. | Component proof and focused navigation checks. |
| Practice draft/save cutover | HIGH | Current code autosaves on toggle/reorder, so refactoring to drafts can regress mode-order persistence or at-least-one guard behavior. | Vitest interaction coverage and save/reload proof. |
| Review draft/save cutover | HIGH | Current number/toggle edits autosave immediately; draft conversion can regress validation, empty input handling, or cache refresh. | Vitest interaction coverage and save/reload proof. |
| Level 5 shell migration | MEDIUM | Layout refactor must not change list filters, search, single remove, or bulk remove semantics. | Focused UI regression and manual browser proof. |
| Product-doc drift | MEDIUM | Existing docs still advertise one unified `/settings` page. | Product-doc update aligned to Feature 24 before closeout. |
| Four-surface visual cutover | MEDIUM | A shared redesign can regress save states, active navigation, Level 5 filtering, or narrow-width layout even without API changes. | focused Vitest for all four pages, build/lint, and browser proof at 320/768/1024/1440 widths |

## Likely File Boundaries

- Frontend routing:
  `src/frontend/src/App.tsx`
- Settings routes/components:
  `src/frontend/src/routes/settings/SettingsPage.tsx`,
  `LevelFiveSettingsPage.tsx`,
  `ReviewSettingsPage.tsx`,
  plus new route/shell components as needed under
  `src/frontend/src/routes/settings/`
- Frontend tests:
  `src/frontend/src/routes/settings/SettingsPage.test.tsx`
  and any new route-level settings tests
- Product docs:
  `docs/product/authentication.md`,
  `docs/product/learning-workflows.md`

## Validation Ladder

1. Focused route/component validation for the shared shell and `/settings`
   redirect.
2. Frontend save-flow tests for Profile, Practice, Review, and Level 5 route
   behavior.
3. Frontend lint and production build.
4. Focused Playwright/browser proof for protected split routes, manual saves,
   and Level 5 inside the shared shell.
5. Harness matrix refresh for the new settings stories.

## Open Checks For The First Story

- Confirm whether `ReviewSettingsPage.tsx` should be deleted after the split or
  repurposed into a route-local implementation.
- Confirm whether a nested `/settings/*` route layout or explicit sibling route
  registration is the cleaner fit for the current router structure.
- Confirm whether existing Playwright coverage should live in
  `learning-navigation.spec.js` only or needs a dedicated Settings-focused spec
  update.
