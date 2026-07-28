# Design

## Recommended Path

Keep the change inside the Journal feature and Journal-scoped design-system
selectors. `journal.routes.tsx` already requests `max-w-none p-0`, so
`JournalPage` should consume the width provided by AppShell instead of adding a
second navigation offset or centered content cap.

Restructure the existing `JournalPage` form without changing its React Query
state or API calls:

1. Keep the search label as the only visible top-row control and align it left.
2. Compose calendar and recent entries as one compact left rail.
3. Render title/date and the action group in one editor header. The action order
   is Save, then Delete; the existing save-status element moves beside them.
4. Render the existing `JournalRichTextEditor` immediately after that header so
   its formatting toolbar precedes its borderless content surface.
5. Remove only the footer presentation and its word/character computations.
6. Preserve the existing confirmation dialog, mutations, cache invalidation,
   debounced search, date-selection behavior, and two-second autosave.

## UI Structure

```text
Journal page (fills AppShell content)
├─ Search (left aligned)
└─ Workspace
   ├─ Left rail (~260px desktop)
   │  ├─ Calendar
   │  └─ Recent Entries
   │     └─ Title + full date
   └─ Editor (minmax(0, 1fr))
      ├─ Header
      │  ├─ Title
      │  ├─ Date
      │  └─ Save status + Save + Delete
      ├─ Formatting toolbar
      └─ Borderless content surface
```

## Layout And Overflow

- Remove the obsolete `.journal-page` `margin-left: 280px`; AppShell already
  owns the navigation rail.
- Replace fixed or duplicate viewport sizing with a page box that fills the
  AppShell content area and uses `min-width: 0` on flex/grid children.
- Remove `.journal-editor-inner`'s `max-width: 768px` and centered auto margins.
- Use a compact fixed/minmax rail and `minmax(0, 1fr)` editor column on desktop.
- Contain vertical overflow inside the recent-entry list and writing area when
  needed; do not create whole-page horizontal overflow.
- Reflow the workspace for narrow viewports. Toolbar controls may wrap, but
  must not overlap or force the page wider than the viewport.

## Entry List Rendering

The search response may still contain title highlight ranges. Apply those
ranges inside the single title element instead of rendering a second preview
paragraph. Render the formatted date below or adjacent to the title according
to available width. Remove the `ENTRY` badge and its obsolete CSS.

## State And Accessibility

- AppShell retains the route-level screen-reader heading `Journal`, so removing
  the visible `My Journal` heading does not remove the page name from assistive
  technology.
- Preserve the search input label, clear-search label, editor labels, calendar
  date names, Save test id, and Delete accessible name.
- Keep status updates in the existing `journal-save-status` live-readable
  element after moving it to the header.
- Preserve logical keyboard order: search, calendar/list navigation, title,
  date, Save, Delete, formatting controls, editor.
- Keep the destructive action behind the current accessible confirmation
  dialog.

## Integration Boundaries

Expected implementation files:

- `src/frontend/src/features/journal/journal.routes.tsx` (route-local removal of
  AppShell's responsive padding at `lg` widths)
- `src/frontend/src/features/journal/pages/JournalPage.tsx`
- `src/frontend/src/features/journal/pages/JournalPage.test.tsx` (new focused
  page contract tests)
- `src/frontend/src/styles/design-system.css` (Journal-scoped rules only)
- `src/frontend/e2e/journal-workspace-redesign.spec.js` (new deterministic
  responsive proof)
- `docs/product/journal.md`
- this story packet and Harness evidence

The route uses both `p-0` and `lg:p-0`. The explicit responsive override is
required because AppShell's default `lg:p-8` otherwise wins at desktop widths
and leaves 32 pixels of unused space on both sides.

Regression-only dependencies, not expected implementation targets:

- `src/frontend/src/features/journal/components/JournalRichTextEditor.tsx`
- `src/frontend/src/features/journal/components/JournalRichTextEditor.test.tsx`
- `src/frontend/src/features/notes/pages/NotesPage.test.tsx`
- existing Journal Playwright specifications

The shared editor currently has user-owned worktree changes for Notes toolbar
hosting. This story must not rewrite or revert them. Journal-specific behavior
should be achieved through `JournalPage` composition and scoped selectors.

## Alternatives Considered

1. Change AppShell's global max width or sidebar layout. Rejected because the
   Journal route already opts into `max-w-none p-0`, and a global change would
   affect every protected route.
2. Change global `.journal-toolbar` or shared editor behavior. Rejected because
   Notes reuses that editor and currently has unrelated in-progress changes.
3. Keep the centered `768px` writing column and only move controls. Rejected
   because it leaves the exact unused space the approved design is intended to
   remove.
4. Split CSS, list rows, and editor header into separate stories. Rejected
   because none is independently demonstrable; the user-approved outcome is one
   cohesive workspace.

## Product And Architecture Impact

- Update `docs/product/journal.md` with the approved presentation contract.
- No architecture decision record is required because ownership, APIs, schema,
  route boundaries, and shared-component contracts do not change.
