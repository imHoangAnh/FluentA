# Validation

## Result

`IMPLEMENTED — ACCEPTANCE PROOF PASSED`

The approved Settings workspace is implemented across all four existing
routes. The story changes presentation and interaction composition only: no
API, DTO, database schema, migration, route, cache-key, dependency, or learning
algorithm changed.

## Acceptance Matrix

| Acceptance criterion | Evidence | Result |
| --- | --- | --- |
| Shared visible heading, icon navigation, active state, responsive layout | `SettingsLayout.tsx`; browser proof at 320, 768, 1024, and 1440 pixels | pass |
| Profile keeps avatar, validation, retry, cache/auth update, and explicit save | `SettingsPage.tsx`; Profile component tests; existing signed-avatar E2E selectors reconciled | pass |
| Practice keeps inclusion guard, ordering, draft-on-error, cache update, and explicit save | `SettingsPracticePage.tsx`; focused component tests | pass |
| Review keeps limit, recap, draft-on-error, cache update, and explicit save | `SettingsReviewPage.tsx`; focused component tests; persisted workflow E2E selectors reconciled | pass |
| Search is left of one All/Active/Inactive dropdown | Level 5 component test plus browser dropdown assertion | pass |
| Final-column row checkboxes and visible-active select-all never select inactive rows | Level 5 tests for select, clear, search, and inactive exclusion | pass |
| Remove is disabled without selection and requires confirmation | Level 5 cancel/confirm/failure tests plus Alert Dialog browser proof | pass |
| Success marks cached items inactive and clears selection; failure retains the draft | Level 5 React Query integration tests | pass |
| Loading/error/empty/save/pending states remain understandable and accessible | focused component assertions, semantic table, `aria-pressed`, labeled checkboxes, Alert Dialog, focus restoration | pass |
| No horizontal page overflow at locked widths | Playwright asserts document width at 320, 768, 1024, and 1440; the table scroll remains internal | pass |

## Automated Proof

### Focused Vitest

```text
node node_modules/vitest/vitest.mjs run \
  src/test/app/App.test.tsx \
  src/test/settings/SettingsPage.test.tsx \
  src/test/settings/SettingsPracticePage.test.tsx \
  src/test/settings/SettingsReviewPage.test.tsx \
  src/test/settings/LevelFiveSettingsPage.test.tsx
```

Result: PASS — 5 files, 21 tests.

The suite covers route rendering, explicit-save states, mode ordering, Review
drafts, Level 5 search/filter selection, visible-active select-all, Cancel with
no mutation, confirmed mutation/cache update, and failed-mutation recovery.

### Targeted ESLint

```text
node node_modules/eslint/bin/eslint.js \
  src/features/settings \
  src/test/settings \
  src/test/app/App.test.tsx \
  e2e/settings-account-learning.spec.js \
  e2e/settings-workspace-redesign.spec.js \
  e2e/spaced-daily-planning.spec.js
```

Result: PASS — exit code 0.

### Responsive Browser Proof

```text
node node_modules/playwright/cli.js test \
  e2e/settings-workspace-redesign.spec.js --reporter=line
```

Result: PASS — 4/4 tests at 320, 768, 1024, and 1440 pixels against the live
Vite runtime with deterministic API fixtures.

The proof navigates all four Settings routes, checks document overflow after
each route, opens the single filter dropdown, selects all visible active words,
opens and cancels the removal dialog, verifies focus restoration, confirms the
table scroll stays internal, and captures a screenshot at every width.

### Production Build

The current dirty worktree command:

```text
npm --prefix src/frontend run build
```

remains blocked outside this story by the pre-existing unused `RotateCw` import
in `src/frontend/src/features/flashcards/pages/FlashcardViewerPage.tsx:1`.

To isolate the story, a detached temporary worktree at `HEAD` received only the
five changed Settings pages and three new Settings components, reused the
existing frontend dependencies through a temporary junction, and ran the same
`tsc -b && vite build` script. Result: PASS — 2,097 modules transformed. The
temporary worktree and junction were removed after proof.

### Scoped Diff Integrity

`git diff --check` is run against the Settings source/tests/E2E files, E25 story
packet, and two affected product documents. `design-system.css` remains
untouched by this story so unrelated worktree edits are preserved.

## Review Notes

- The installed Radix Dropdown Menu and shared Alert Dialog are reused; no new
  package was added.
- At 320 pixels the Settings navigation intentionally uses one column so all
  four labels remain readable. From 400 pixels it becomes two columns, and at
  900 pixels it becomes the compact sidebar.
- Inactive Level 5 words remain searchable and visible. Only active rows expose
  selection, and removal preserves review history through the existing inactive
  transition.
- The first browser attempt exposed a `localhost` versus `127.0.0.1` binding
  mismatch, and a later shell invocation exposed NVM PATH drift to Node 12.
  Final browser, lint, and Vitest proof used the bundled Node 24 runtime and the
  live `localhost:5173` Vite process.
