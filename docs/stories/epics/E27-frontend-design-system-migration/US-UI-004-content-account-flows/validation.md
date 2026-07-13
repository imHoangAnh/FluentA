# US-UI-004 Validation Evidence

Date: 2026-07-13

## Status

`IMPLEMENTED AND APPROVED`

The approved content/account milestone is implemented. Journal, Notes,
Notifications, and every Settings subroute now use AppShell while retaining
their existing routes, API contracts, ownership boundaries, mutation ordering,
editor behavior, and asset lifecycle.

## Proof Matrix

| Layer | Result | Evidence |
| --- | --- | --- |
| Unit | pass | Frontend Vitest: 9 files, 36 tests passed. The two baseline Notes failures and effect lint finding are resolved without weakening assertions. |
| Integration | pass | API-backed Chromium scenarios cover Journal CRUD/ownership/search/calendar/autosave/sanitization, Notes CRUD/persistence/image cleanup/ownership, notification ownership and read operations, and Profile/Practice/Review persistence. Existing Settings unit coverage retains avatar retry/delete behavior. |
| E2E | pass | Story-scoped Playwright Chromium: 10/10 passed across four Journal specs, Notes, Notifications, and Settings. |
| Platform | pass | ESLint passed; TypeScript and Vite production build passed; 1440x1000 and 1024x900 screenshot/overflow checks passed for Notifications and Settings, with responsive coverage retained in Journal and Notes specs. |
| Release | pass | Source scans confirm the migrated routes no longer import `DashboardPage.css` or `NotesPage.css`, duplicate dashboard/workspace/settings shells, or use presentation inline styles. The only inline style survivor is the editor's computed zoom custom property. |

## Acceptance Evidence

- Journal keeps explicit create, newest-first owner-scoped entries, title-only
  Unicode search, populated/empty calendar dates, accessible deletion,
  sanitized rich text, and the two-second existing-entry autosave boundary.
- Notes keeps protected access, board/page creation, save on blur and before
  switching, rich-text editing, durable note-image upload, removed-image
  cleanup, upload error handling, and owner isolation.
- Notifications now exposes readable loading, empty, error, unread, mark-one,
  mark-all, and pending states. API proof confirms an unknown or foreign
  notification cannot be marked read.
- Settings keeps Profile, Practice, Review, and Level 5 routes. API-backed
  browser proof confirms profile and learning-setting persistence; focused unit
  proof retains avatar finalize retry, saved-avatar deletion, and selection
  synchronization.
- Desktop and tablet primary actions remain visible and no checked route has
  unintended page-level horizontal overflow.
- `docs/product/assets.md` now records the shipped `note-image` asset flow.

## Commands And Results

```text
vitest run
9 test files passed; 36 tests passed

eslint .
passed

tsc -b && vite build
passed

playwright test [US-UI-004 seven-spec set] --workers=1
10 tests passed
```

The production build continues to emit non-blocking third-party SignalR pure
annotation and bundle-size advisory warnings. Neither warning was introduced
by this story and neither blocks the generated application bundle.

## CSS Boundary

US-UI-004 removes route-level imports and unreachable presentation usage only.
Physical retirement of dead legacy stylesheets and the initiative-wide
consumer audit remain intentionally assigned to US-UI-005.
