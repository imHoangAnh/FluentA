# Current Story Pack: US-SETTINGS-005 Settings Workspace Redesign

## Epic

E25 Settings Route Split

## Entry State

- `/settings/profile`, `/settings/practice`, `/settings/review`, and
  `/settings/level5` already render inside one protected Settings shell.
- Profile, Practice, and Review already keep edits local until an explicit save.
- Level 5 already supports status filtering, word search, selection, and
  removal through the existing Review API.
- The current pages still use legacy oversized Settings CSS and inconsistent
  row/card patterns.
- The user approved an interactive redesign for all four surfaces and then
  approved the refined Level 5 table/filter/remove interaction.

## Exit State

All four Settings routes use one compact, responsive workspace with icon-led
secondary navigation and a consistent content panel. Existing save, error,
loading, API, cache, and route behavior remains intact. Level 5 presents search
first, one filter dropdown to its right, a final-column checkbox per active
row, a final-column select-all checkbox for visible active rows, and an Alert
Dialog confirmation before selected words are marked inactive.

## Locked Decisions

- `D1` — Keep the existing four routes and shared shell; `/settings` still
  redirects to `/settings/profile`.
- `D2` — Show a visible Settings heading/description, then a compact sidebar on
  wide screens and a wrapped navigation grid on narrow screens.
- `D3` — Use the approved Profile composition: avatar actions, full name,
  read-only email, bio, explicit save, and existing validation/error behavior.
- `D4` — Use the approved Practice composition: selectable mode tiles, ordered
  sequence rows with move actions, and explicit save.
- `D5` — Use the approved Review composition: daily-limit row, recap switch,
  and explicit save.
- `D6` — Level 5 search is the leftmost control and one Filter dropdown sits to
  its right with All, Active, and Inactive options.
- `D7` — Level 5 row checkboxes and the select-all checkbox occupy the final
  table column. Select-all applies only to visible active words.
- `D8` — `Remove selected` opens a confirmation Alert Dialog. Confirming uses
  the existing mutation, marks selected words inactive, preserves history, and
  clears selection after success.
- `D9` — No API, DTO, database schema, route, cache-key, or learning-domain
  behavior change is authorized.

## Scope

In scope:

- Shared Settings layout and navigation presentation.
- Presentation of Profile, Practice, Review, and Level 5.
- Level 5 filter dropdown, table selection, select-all, and confirmation flow.
- Focused tests, product-contract wording, and Harness evidence.

Out of scope:

- New settings fields or learning behaviors.
- Autosave or route behavior changes.
- Backend, API, DTO, schema, migration, or storage work.
- Removing Level 5 review history.

## Story

`US-SETTINGS-005` — Settings Workspace Redesign

Lane: `normal`

Status: `implemented`

Risk flags:

- Existing behavior.
- Weak proof for the new responsive and confirmation interactions.

## Expected Files

- `src/frontend/src/features/settings/pages/SettingsLayout.tsx`
- `src/frontend/src/features/settings/pages/SettingsPage.tsx`
- `src/frontend/src/features/settings/pages/SettingsPracticePage.tsx`
- `src/frontend/src/features/settings/pages/SettingsReviewPage.tsx`
- `src/frontend/src/features/settings/pages/LevelFiveSettingsPage.tsx`
- focused tests under `src/frontend/src/test/settings/` and
  `src/frontend/src/test/app/App.test.tsx`
- browser proof in `src/frontend/e2e/settings-workspace-redesign.spec.js`
- `docs/product/authentication.md`
- `docs/product/learning-workflows.md`
- `docs/stories/epics/E25-settings-route-split/US-SETTINGS-005/*`

The already-dirty `src/frontend/src/styles/design-system.css` is not required:
the implementation should use existing semantic utilities and shared UI
primitives so unrelated worktree changes remain untouched.

## Verification

- Focused Vitest for Settings routing and all four Settings pages.
- Targeted ESLint for changed Settings source/tests.
- Frontend production build.
- Responsive browser proof at 320, 768, 1024, and 1440 widths when the local
  runtime can be served.
- `git diff --check` scoped to story-owned files.

## Approval Gate

Approved before source implementation. Completion evidence is recorded in the
story validation document and Harness matrix.
