# US-UI-004 Exec Plan

## Goal

Produce the fourth user-approved E27 milestone without changing content,
notification, account, learning-setting, asset, or editor contracts.

## Risk Classification

Lane: high-risk.

Risk flags:

- two rich-text, autosaving, asset-aware workspaces;
- dirty-draft and request-version race conditions;
- upload/finalize/delete lifecycle and auth-store synchronization;
- nested protected settings routes and destructive bulk actions;
- incomplete Notification state coverage;
- existing Notes unit/lint failures;
- global CSS collision and tablet workspace density.

## Dependency-Ordered Phases

1. **Baseline and behavior characterization**
   - Record protected route map, API/query keys, mutation ordering, legacy CSS
     imports/consumers, inline styles, focused tests, and 1440/1024 screenshots.
   - Reproduce the two Notes unit failures and effect-lint finding. Determine
     whether they are stale assertions, async query initialization defects, or
     product regressions; preserve behavior and strengthen tests rather than
     changing acceptance to make them pass.
   - Characterize Journal create versus autosave, Notes save-before-switch,
     notification failure behavior, and avatar upload retry/delete behavior.
2. **Complete shared content/account primitives**
   - Add only missing AlertDialog/Dialog, Label/Textarea, Alert, and any
     contract-matching Checkbox/Switch/navigation primitive.
   - Prove focus trap/return, keyboard operation, pending protection, labels,
     and destructive semantics with focused component tests.
3. **Migrate Journal**
   - Replace duplicate shell/navigation, legacy layout classes, and
     presentation-only inline styles.
   - Recompose search, calendar, list, editor, autosave status, and delete
     confirmation without changing state ownership or HTML persistence.
   - Run all four Journal Chromium scenarios and focused keyboard/viewport
     proof before continuing.
4. **Migrate Notes**
   - Replace duplicate shell and `DashboardPage.css`/`NotesPage.css`
     dependencies with AppShell and the approved system.
   - Correct draft initialization architecture, restore the failing empty/create
     tests, and preserve save-on-blur/save-before-switch and image cleanup.
   - Run all Notes unit and API-backed browser scenarios before continuing.
5. **Migrate Notifications**
   - Build AppShell inbox states and accessible mark-one/mark-all actions.
   - Add focused unit coverage and an API-backed Chromium scenario for empty,
     unread, mark-one, mark-all, pending/error, and unread-count refresh.
6. **Migrate Settings**
   - Replace the custom outer shell while keeping nested subroutes.
   - Recompose Profile/avatar, Practice, Review, and Level 5 surfaces.
   - Add route-level Chromium coverage for nested navigation, profile save and
     avatar lifecycle, setting persistence, and single/bulk Level 5 removal.
7. **Remove bounded legacy dependencies**
   - Remove duplicated navigation, route imports, unreachable selectors, and
     presentation-only inline styles for the four migrated areas.
   - Produce an explicit computed-inline-style and active-CSS carryover list
     for `US-UI-005`.
8. **Milestone proof and approval**
   - Run focused/full unit, story-scoped/full lint, build, API-backed Chromium,
     keyboard, deterministic screenshot, source-scan, and diff checks.
   - Document unrelated failures separately and present the running milestone.
   - Stop for milestone approval before any `US-UI-005` implementation.

## Concrete Proof Ladder

```powershell
npm.cmd --prefix src/frontend run test:run
npm.cmd --prefix src/frontend run lint
npm.cmd --prefix src/frontend run build
npx.cmd --prefix src/frontend playwright test `
  e2e/journal-foundation.spec.js `
  e2e/journal-calendar.spec.js `
  e2e/journal-search.spec.js `
  e2e/journal-rich-text-autosave.spec.js `
  e2e/notes-workspace.spec.js `
  e2e/notifications-inbox.spec.js `
  e2e/settings-account-learning.spec.js `
  e2e/content-account-responsive.spec.js --workers=1
rg -n "dashboard-layout|dashboard-sidebar|workspace-shell|settings-shell|LearningNavLinks|DashboardPage.css|NotesPage.css" `
  src/frontend/src/routes/journal `
  src/frontend/src/routes/notes `
  src/frontend/src/routes/notifications `
  src/frontend/src/routes/settings
git diff --check
```

The final four E2E filenames are planned additions where focused coverage does
not currently exist. Use the repository's discovered Playwright configuration;
do not assume a named Chromium project. Capture deterministic desktop/tablet
screenshots for representative Journal, Notes, Notifications, and Settings
states.

## Stop Conditions

- Preserving an in-scope behavior requires an API, DTO, schema, ownership,
  sanitization, asset, background-job, or realtime change.
- Notes save-before-switch or Journal autosave behavior remains ambiguous after
  source, product docs, unit tests, and browser characterization.
- Replacing the editor or asset lifecycle appears necessary.
- A product-doc contradiction would expose a currently deferred feature.
- AppShell/shared primitive changes would regress an approved earlier route and
  cannot be isolated safely.

## Rollback Boundary

Migrate and prove Journal, Notes, Notifications, and Settings independently in
that order. Each route group remains a presentation-bounded rollback unit; no
backend or database rollback should be required. Remove a stylesheet import
only in the same phase that proves its last consumer has migrated.
