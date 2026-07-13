# E28 Vocabulary Workspace Polish Context

## Status

- Phase: approved for planning
- Approval: approved by user on 2026-07-13
- Intake: `#83`, change request
- Lane: normal

## Initiative Outcome

Refine the shared AppShell and Vocabulary workspace so destructive actions are
explicit and confirmed, dense board/page and word collections scroll inside
stable viewport regions, long cell content remains fully readable, and manual
Vocabulary create/delete success is acknowledged consistently.

## Current Behavior

- Vocabulary already exposes owner-scoped API operations for deleting boards,
  pages, and words, including the existing flashcard/review cleanup contract.
- The Board/Page rail has no delete affordance in the current UI.
- Word deletion uses `window.confirm` rather than the shared modal system.
- The Vocabulary workspace has minimum-height layout rules, so a large word
  collection can extend the route instead of keeping the toolbar and column
  header stable while rows scroll.
- Cells use fixed input/textarea presentation that can introduce inner control
  scrolling for long content.
- The shared AppShell uses an approximately 80 px header, a 272 px expanded
  sidebar, an 84 px collapsed sidebar, and a text-labelled collapse control at
  the bottom of the sidebar.
- Vocabulary create/delete mutations do not currently emit success toasts.

## Feature Boundary

- Add Board and Page deletion affordances through a right-click context menu.
- Replace Word's browser confirmation with the same confirmation-modal pattern.
- Make the Vocabulary Board/Page rail and word rows independently scrollable
  inside a viewport-bound workspace.
- Refine table borders and long-content wrapping without changing persisted
  Vocabulary fields or spreadsheet autosave behavior.
- Simplify the Vocabulary page toolbar and add non-functional Search and Filter
  placeholders.
- Compact the shared AppShell header/sidebar and relocate its desktop collapse
  control.
- Add bottom-right success toasts for manual Vocabulary create/delete actions.

## Locked Decisions

- **D1 - Delete Page terminology.** The requested hierarchy is Board -> Page ->
  Word. Right-clicking a Board offers `Delete Board`; right-clicking a Page
  offers `Delete Page`. This change does not add deletion of a table column.
- **D2 - Standard confirmation modal.** Board and Page deletion uses a modal
  that identifies the target, explains that related data will be deleted, and
  provides `Cancel` and destructive `Delete` actions. The user does not have to
  type the target name.
- **D3 - Selection after deletion.** Deleting the active Page selects the newest
  remaining Page. Deleting the active Board selects the newest remaining Board.
  An empty state appears only when no replacement exists.
- **D4 - Vocabulary-only toast scope.** Success toasts in this story belong to
  Vocabulary actions, not every FluentA module. Cell autosave and automatic
  column-preference persistence do not emit success toasts.
- **D5 - Compact header means height.** The shared AppShell header retains its
  full width and is reduced from approximately 80 px to approximately 56 px,
  with matching compact padding.
- **D6 - Sidebar widths.** The expanded sidebar is reduced from 272 px to 184
  px. The collapsed sidebar remains 84 px.
- **D7 - Collapse control breakpoint.** On desktop, the collapse/expand control
  is an icon-only button beside the logo. Its accessible name remains. At
  widths of 1100 px or less, the sidebar remains forced to 84 px and the
  control remains hidden.
- **D8 - Board/Page rail scrolling.** Only the Vocabulary Board/Page rail is in
  scope for the requested collection scrolling. Its heading and create-board
  action remain fixed while the Board/Page tree scrolls. The AppShell nav
  already has an independent scrolling region and is not reworked here.
- **D9 - Viewport-bound Vocabulary workspace.** The workspace fits in the
  viewport below the AppShell header. The page toolbar and table column header
  remain fixed. Only word rows scroll vertically, while the Board/Page rail
  scrolls independently.
- **D10 - Adaptive high-contrast column dividers.** A 1 px divider separates
  every table column across the column header, existing Word rows, and the new
  Word row. It is near-black on light surfaces and adapts to a contrasting
  light color if another theme is introduced.
- **D11 - Content-sized cell controls.** Each cell control grows according to
  its own wrapped content and has no inner scrollbar. A short control does not
  stretch to match the tallest control in its row. The row still occupies the
  height required by its tallest cell so the following row cannot overlap it.
- **D12 - Display-only Search and Filter.** Search and Filter are UI
  placeholders only. They do not open controls, query the backend, or filter
  client-side data in this story.
- **D13 - Page toolbar composition.** The toolbar shows only the Page name on
  the left and `Search`, `Filter`, `Setting Columns` in that order on the right.
  It removes the Board-name eyebrow and the current Table View icon button.
- **D14 - Eligible toast triggers.** Successful Create Board/Page/Word actions
  emit specific create toasts. Successful Delete Board/Page/Word actions emit
  specific delete toasts. Update and manual-save toast variants may be
  standardized for future eligible actions, but this story adds no toast for
  autosave and no rename/manual-save feature merely to trigger them.
- **D15 - Right-click selection.** Right-clicking an inactive Board or Page
  selects and highlights it before opening the context menu so the destructive
  target is visible.
- **D16 - Shared AppShell scope.** Header height, expanded-sidebar width, and
  collapse-control placement apply to every route that consumes AppShell, not
  only Vocabulary. Authentication's separate shell is unaffected.
- **D17 - Disabled placeholders.** Search and Filter render disabled and expose
  a `Coming soon` tooltip or equivalent accessible description rather than
  appearing functional without a response.
- **D18 - Success toast behavior.** Toasts appear at the bottom right, dismiss
  automatically after approximately three seconds, include an icon-only close
  action, and stack with the newest toast at the bottom. Copy names the entity
  and result, for example `Board created successfully`.

## Delete Cause And Effect

- Confirming Board deletion uses the existing Board delete contract: the Board
  becomes unavailable and its affected Pages, Words, synchronized flashcards,
  review state, and review history are cleaned up according to current product
  rules.
- Confirming Page deletion removes that Page from the active Board and cleans up
  its affected Words and learning records according to the same current
  contract.
- Confirming Word deletion soft-deletes the source Word and removes its
  synchronized learning records according to the current contract.
- Cancelling any confirmation leaves the target and current persisted data
  unchanged.

## Explicit Exclusions

- Deleting fixed or optional Vocabulary table columns.
- Search or Filter behavior, backend endpoints, query parameters, or client-side
  result filtering.
- New Board/Page rename controls or a new manual Save workflow.
- Success toasts for autosave or automatic preference persistence.
- App-wide adoption of create/update/delete/save success toasts outside the
  Vocabulary actions named in D14.
- API, database schema, domain, ownership, flashcard-sync, or review-cleanup
  contract changes.
- A new mobile navigation pattern, a dark-mode feature, or non-Chromium browser
  remediation.

## Affected Product Contracts

- `docs/product/vocabulary-board.md`
- `docs/product/flashcards.md`
- `docs/product/learning-workflows.md`
- `docs/stories/epics/E27-frontend-design-system-migration/context.md`
- `docs/stories/epics/E27-frontend-design-system-migration/US-UI-001-foundation-shell-dashboard-vocabulary/overview.md`

## Deferred To Planning

- Exact shared Context Menu, Alert Dialog, Tooltip, and Toast primitives to
  reuse or introduce within the current Radix/shadcn boundary.
- Component boundaries and state transitions for pending and failed deletion.
- The CSS height calculation beneath the compact AppShell header and the exact
  sticky/overflow containment needed for desktop and tablet Chromium.
- The textarea measurement strategy that preserves keyboard/autosave contracts
  while giving each cell control content-sized height.
- Unit, integration, Playwright, viewport, and visual evidence boundaries.

## Approval Gate

The user approved D1-D18 on 2026-07-13. Planning may proceed. Source
implementation remains gated on approval of the tracked work shape and
readiness validation.
