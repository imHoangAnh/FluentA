# Epic Map: Settings Route Split

Mode: `standard_feature`

## Feature Outcome

FluentA exposes a shared desktop Settings shell with a fixed sidebar and four
second-level routes for Profile, Review, Practice, and Level 5. Profile,
Practice, and Review all use explicit manual saves, while Level 5 keeps its
existing global-management behavior inside the same shell.

## Architecture / Reality Basis

- The current router still treats `/settings` as the combined settings page and
  only Level 5 lives on a separate settings route.
- `SettingsPage.tsx` already contains the full profile/avatar flow that must be
  preserved, but Practice and Review currently autosave in that same file.
- `LevelFiveSettingsPage.tsx` already implements the target second-level route
  pattern conceptually, but not inside a shared shell/sidebar layout.
- The backend aggregate/profile/practice/review APIs already exist, so this
  feature is primarily a frontend route/layout/save-flow cutover plus product
  doc and proof reconciliation.

## Epics

| Epic | Capability / Risk Area | Why It Exists | Stories | Proof Needed |
| --- | --- | --- | --- | --- |
| E25-A | Shared shell and route ownership | Establish the new second-level route structure and `/settings` redirect before moving behavior between screens | US-SETTINGS-002 | protected routing, active-nav, redirect, shell rendering proof |
| E25-B | Manual-save settings cutover | Move Profile, Practice, and Review into route-local drafts with explicit save behavior only | US-SETTINGS-003 | profile/avatar save, practice save, review save, reload/error proof |
| E25-C | Release reconciliation | Prove Level 5 behavior survives in-shell and refresh docs/tests/matrix to the split-route contract | US-SETTINGS-004 | Level 5 regression, docs refresh, focused browser proof, matrix evidence |

## Story Queue

| Story | Epic | Outcome | Depends On | Feasibility Status |
| --- | --- | --- | --- | --- |
| US-SETTINGS-002 | E25-A | `/settings` redirects to `/settings/profile` and all four second-level Settings routes render inside one shared shell | none | Ready to implement |
| US-SETTINGS-003 | E25-B | Profile, Practice, and Review each use route-local drafts plus explicit save actions without autosave | US-SETTINGS-002 | Ready after the shell and route split land |
| US-SETTINGS-004 | E25-C | Level 5 remains functional inside the shared shell and docs/proof reflect the split-route contract | US-SETTINGS-002, US-SETTINGS-003 | Ready after route and save-flow cutover |

## Current Story To Prepare

`US-SETTINGS-002` - Introduce the shared Settings shell, sidebar, route split,
and `/settings` redirect.

Why now:

- It creates the route/layout foundation every later settings slice depends on.
- It isolates navigation and shell risk before manual-save refactors change the
  form behavior of three separate settings surfaces.
- It gives validation a stable place to prove active sidebar state, protected
  routing, and Level 5 shell integration.
