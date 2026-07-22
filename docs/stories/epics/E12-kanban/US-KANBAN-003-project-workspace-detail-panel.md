# US-KANBAN-003 Kanban Project Workspace And Card Detail Panel

## Status

implemented

## Lane

normal

## Product Contract

Refine the existing `/kanban` workspace without changing its API, persistence,
ownership, filtering, ordering, drag/drop, or SignalR contracts. The visible
workspace heading follows the selected project, destructive project deletion
moves from the always-visible button to the exact project tab, column creation
moves into the filter toolbar, and card create/edit details use a persistent
right-side panel instead of the current centered editor modal.

## Relevant Product Docs

- `docs/product/kanban.md`
- `docs/decisions/0024-kanban-board-foundation-boundary.md`
- `docs/decisions/0025-kanban-card-move-signalr-sync.md`
- `docs/stories/epics/E27-frontend-design-system-migration/US-UI-003-productivity-flows/design.md`

## Locked Decisions

- **D1:** Keep multiple project tabs and the current new-project input. Selecting
  a tab updates the visible workspace heading to that project's name; the
  AppShell route heading remains the screen-reader-only `Kanban` heading.
- **D2:** Remove the always-visible `Delete Board` button. Right-clicking a
  project tab, or invoking its keyboard context-menu equivalent, opens a
  confirmation dialog for that exact project with no intermediate action menu.
- **D3:** The confirmation names the project, explains that its columns and
  cards are removed, supports Cancel/Escape, disables duplicate confirmation
  while pending, and restores focus safely after cancel or success.
- **D4:** Place `Add column` at the far right of the same toolbar row as the
  Priority and Deadline filters. Preserve the current required-name validation
  and existing create-column endpoint; the action reveals the lightweight name
  entry rather than adding a new modal or API.
- **D5:** Keep a spacious three-column desktop composition inspired by the
  approved demo. The Kanban board owns any required horizontal overflow; the
  AppShell page itself must not overflow.
- **D6:** Clicking an existing card opens its editable details in a persistent
  panel on the right. `Add Card` opens the same panel in create mode so the old
  centered card editor modal can be removed instead of retaining two editor
  patterns.
- **D7:** The panel contains Title, Description, Priority, Deadline, Delete,
  Cancel/Close, and Save. It does not contain `Move to`.
- **D8:** Removing `Move to` from the panel does not remove card movement. Keep
  pointer drag/drop and the existing explicit per-card Move control so keyboard
  and narrow-screen users retain a non-drag path.
- **D9:** Cards continue to show only title, priority, and deadline. Avatars,
  assignees, progress bars, tags, search, and other unsupported fields remain
  out of scope.

## Acceptance Criteria

- The selected project name is the visible Kanban workspace heading and updates
  when another project tab is selected.
- Project tabs remain the selection surface, and creating a new project still
  uses the existing create-board behavior.
- No visible `Delete Board` button remains in the project header or toolbar.
- Right-clicking a project tab opens an accessible confirmation naming the exact
  target; Cancel/Escape sends no DELETE request and Confirm calls the existing
  board delete endpoint once.
- Deleting the active project selects a remaining project using the current
  board-list order, or shows the established empty state when none remain.
- Priority, Deadline, and `Add column` share the top toolbar, with `Add column`
  aligned at the far right and preserving current name validation.
- Existing cards render title, priority, and deadline only. Clicking a card
  opens the right detail panel without obscuring the board.
- Add Card opens the right panel in create mode; editing and creation preserve
  current required title, optional description, priority, and deadline rules.
- Panel Save uses the existing create/update mutations. Delete is available only
  for an existing card and uses the existing delete mutation.
- Closing with Close, Cancel, or Escape returns focus to the originating card or
  Add Card control. The non-modal board remains readable while the panel is open.
- The panel has no `Move to` field. The existing per-card Move control and
  pointer drag/drop continue to move and reorder cards, including SignalR cache
  invalidation after durable moves.
- Desktop `1440x1000` and tablet `1024x900` avoid page-level horizontal overflow;
  Kanban column overflow remains local to the board when required.
- Loading, empty, mutation-pending, delete-failure, and non-empty-column error
  behavior remain visible and usable.

## Design Notes

- **Recommended path:** split the current large page into focused presentation
  components while keeping React Query state and mutations in `KanbanPage`.
- **Components:** add a card detail panel and a board delete confirmation dialog;
  extract project tabs or toolbar only if needed to keep the page maintainable.
- **Delete target:** store `{ boardId, name }` at right-click time. Never derive
  the target later from `selectedBoardId`, because the active tab can change
  before confirmation resolves.
- **Panel state:** keep a discriminated create/edit state and the trigger element
  used for focus restoration. Reinitialize form fields whenever the target card
  changes, and retain current mutation/invalidation behavior.
- **Accessibility:** the panel is a labelled `<aside>`, not a modal or focus
  trap. Focus its title input when opened; Escape closes it only when no nested
  control has consumed the key. Project tabs support the native Context Menu key
  and `Shift+F10` in addition to pointer right-click.
- **Responsive layout:** use a bounded right panel at desktop/tablet while the
  board remains a locally scrollable column region. Do not add viewport-wide
  overflow or a second app shell.
- **Styling:** reuse the current design system and shared Alert Dialog primitive.
  Do not add a new Kanban CSS file or dependency. If
  `src/frontend/src/styles/design-system.css` must change, edit only the Kanban
  selectors and preserve the user's unrelated Habit/Countdown/Pomodoro changes
  already present in that file.
- **API:** no changes to `kanban.api.ts`, endpoints, envelopes, DTOs, priority
  enum, validation, ownership, deletion semantics, or SignalR payloads.
- **Product docs:** update `docs/product/kanban.md` during implementation so its
  UI rules describe project-tab deletion, the top toolbar, and the right detail
  panel after the behavior exists.

## Expected Files

- `src/frontend/src/features/kanban/pages/KanbanPage.tsx`
- `src/frontend/src/features/kanban/components/KanbanCardDetailPanel.tsx` (new)
- `src/frontend/src/features/kanban/components/DeleteKanbanBoardConfirmationDialog.tsx` (new)
- `src/frontend/src/features/kanban/pages/KanbanPage.test.tsx` (new)
- `src/frontend/src/styles/design-system.css` (Kanban selectors only, if needed)
- `src/frontend/e2e/kanban-board.spec.js`
- `src/frontend/e2e/productivity-responsive.spec.js`
- `docs/product/kanban.md`
- `docs/stories/epics/E12-kanban/US-KANBAN-003-project-workspace-detail-panel.md`
- `docs/stories/epics/E12-kanban/US-KANBAN-003-project-workspace-detail-panel/validation.md`

## Rejected Alternatives

1. Keep the visible Delete Board button: rejected by the approved interaction.
2. Open a context menu before confirmation: rejected because the approved demo
   opens the target-specific confirmation directly from the project tab.
3. Keep the centered card modal for create while using a panel only for edit:
   rejected because it leaves two editor patterns for the same fields and keeps
   obsolete modal code.
4. Remove every explicit Move control and rely only on drag/drop: rejected
   because it breaks the current keyboard and narrow-screen product contract.
5. Change API/schema or add assignee/progress data to match the inspiration
   image: rejected because those fields are outside the approved scope.

## Validation

When implementation begins, durable proof values remain `0` until their layer
has actually passed.

| Layer | Expected proof |
| --- | --- |
| Unit / component | Selected heading follows tab; exact right-click target; keyboard context invocation; confirmation copy; Cancel/Escape/no request; pending single request; replacement/empty state; Add column reveal/validation; panel create/edit initialization; Save/Delete callbacks; no panel Move field; focus open/close restoration. |
| Integration | Existing API methods and React Query keys are reused unchanged; focused source/diff scan proves no backend, API, schema, DTO, ownership, or SignalR contract change. |
| E2E | Create two projects; switch heading; right-click inactive and active tabs; cancel and confirm exact deletion; add a column from the toolbar; create/edit/delete a card through the panel; close with Escape; drag and explicit Move both still work; filters and non-empty-column conflict remain green. |
| Platform | Chromium desktop `1440x1000` and tablet `1024x900`; no document overflow, local board overflow only, readable panel, keyboard focus return, production build. |
| Release | Focused Kanban tests, full frontend tests, lint, build, Playwright Kanban/responsive/sync specs, `git diff --check`, stale modal/Delete Board source scan, and final Harness reconciliation. |

Planned commands:

```powershell
npm --prefix src/frontend run test:run -- KanbanPage
npm --prefix src/frontend run test:run
npm --prefix src/frontend run lint
npm --prefix src/frontend run build
npm --prefix src/frontend run test:e2e -- e2e/kanban-board.spec.js e2e/kanban-sync.spec.js e2e/productivity-responsive.spec.js --workers=1
git diff --check
```

## Implementation Order

1. Add focused component tests that characterize the approved heading, delete,
   toolbar, panel, focus, and retained Move behavior.
2. Add the exact-target board confirmation component using the shared Alert
   Dialog primitive.
3. Add the reusable create/edit card detail panel and replace centered modal
   state in `KanbanPage`.
4. Recompose the toolbar, project tabs, board columns, cards, and local overflow
   without changing query/mutation contracts.
5. Update focused E2E and responsive assertions, then run the proof ladder.
6. Reconcile `docs/product/kanban.md`, story evidence, Harness flags, and trace
   only after executable proof exists.

## Stop Conditions

- Stop if the work requires a new endpoint, DTO, schema, migration, ownership
  rule, deletion behavior, or SignalR event.
- Stop if removing the panel `Move to` field would also remove the existing
  non-drag card move path.
- Stop if preserving the approved panel requires changing AppShell layout for
  unrelated routes.
- Stop if Kanban styling cannot be isolated from the user's existing dirty
  `design-system.css` changes.
- Stop before implementation until the user approves this planned story.

## Harness Delta

- Register this change request and `US-KANBAN-003` in Harness.
- No architecture decision is required because the existing API, ownership,
  persistence, deletion, and realtime boundaries remain unchanged.

## Evidence

- Implementation and review evidence is recorded in
  `US-KANBAN-003-project-workspace-detail-panel/validation.md`.
- Unit, integration-boundary, and browser E2E proof passed on 2026-07-22.
- Responsive desktop/tablet proof passed, but the Harness platform flag remains
  `0` because the repository production build is blocked by a pre-existing
  unused `RotateCw` import in the dirty Flashcard worktree.
