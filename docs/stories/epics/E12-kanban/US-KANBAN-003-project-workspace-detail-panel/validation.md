# Validation

Date: 2026-07-22

## Scope

Pre-implementation reality gate for `US-KANBAN-003`. This validation checks
that the approved Kanban project workspace, project-tab deletion confirmation,
toolbar composition, and right-side card create/edit panel can be implemented
without changing the existing API, database schema, drag-and-drop behavior, or
SignalR contract.

## Feasibility Result

`READY WITH CONSTRAINTS`

| Assumption | Risk | Evidence | Result |
| --- | --- | --- | --- |
| Existing Kanban mutations can support the approved UI. | A new endpoint or DTO could expand the story beyond its approved frontend boundary. | `kanban.api.ts` already exposes board deletion and card create, update, delete, and move operations used by `KanbanPage.tsx`. | Ready; no API or schema work is required. |
| Exact-target project deletion can use an accessible confirmation. | A generic delete handler could delete the selected project instead of the right-clicked project. | The shared Radix `AlertDialog` wrapper exists, and the page can capture `{ boardId, name }` when context-menu input occurs. | Ready; the target must remain stable until confirmation resolves. |
| One right-side panel can serve create and edit flows. | Keeping the old modal for create would leave two competing editor patterns. | Card create and update use the same title, description, priority, and deadline fields. The planned panel state explicitly distinguishes create from edit mode. | Ready; `Add Card` and card click will use the same panel. |
| Existing movement and live-sync behavior can be preserved. | Removing the explicit Move control or changing mutation ownership would regress keyboard and multi-tab behavior. | `KanbanPage.tsx` already owns drag/drop and the explicit Move mutation; `useKanbanSync.ts` invalidates on `KanbanCardMoved`; `kanban-sync.spec.js` observes the behavior. | Ready with constraint: retain both movement paths and the existing query invalidation. |
| The visual change can remain local to Kanban. | Shared-shell or broad stylesheet edits could collide with unrelated worktree changes. | Kanban has feature-local page ownership. Shared `design-system.css` is already dirty from Habit, Countdown, and Pomodoro work. | Ready with constraint: edit only Kanban-specific selectors and preserve all unrelated hunks. |
| The exit state is mechanically observable. | A visually plausible result could miss keyboard, responsive, or exact-target behavior. | Vitest, Testing Library, Playwright, the existing Kanban E2E files, lint, build, and `git diff --check` are available. | Ready; add focused component tests and extend Kanban/responsive E2E proof. |

## Baseline Commands

```text
npm --prefix src/frontend run test:run
npm --prefix src/frontend run build
src/frontend/node_modules/.bin/eslint.cmd src/frontend/src/features/kanban
```

## Baseline Results

| Check | Result | Notes |
| --- | --- | --- |
| Dependency and file inspection | passed | React 19, React Query, Radix AlertDialog, dnd-kit, SignalR, Kanban API hooks, and the focused E2E files exist. |
| Isolated Kanban lint | passed | Current `src/frontend/src/features/kanban` reports no ESLint errors. |
| Full frontend build | blocked by pre-existing unrelated change | TypeScript reports unused `RotateCw` in `src/frontend/src/features/flashcards/pages/FlashcardViewerPage.tsx:1`. Kanban source was unchanged when this baseline ran. |
| Full frontend unit suite | timed out | `vitest run` did not complete within 60 seconds and emitted no final result. This is recorded as a release-proof constraint, not treated as a pass. |
| Kanban E2E baseline | deferred | Requires the authenticated app/backend runtime; it will be run as implementation proof rather than claimed from static inspection. |

## Implementation Constraints

1. Do not add or change backend endpoints, DTOs, database migrations, SignalR
   event names, or query keys.
2. Keep the existing per-card Move control and drag/drop path outside the detail
   panel; the approved removal applies only to the panel.
3. Capture the right-clicked project as the delete target instead of deriving
   the target later from current selection.
4. Keep the card detail panel non-modal, labelled, keyboard reachable, and
   restore focus when it closes.
5. Preserve unrelated worktree changes, especially existing
   `design-system.css` edits.
6. Do not mark release proof complete until focused Kanban tests, lint, build,
   and browser checks have real results. The pre-existing Flashcard build error
   must either be resolved by its owner or reported separately.

## Authorized Story

Only `US-KANBAN-003 Kanban Project Workspace And Card Detail Panel` is ready for
implementation. Adjacent Kanban API, schema, assignment, progress, tag, search,
or route-shell redesign work is not authorized by this validation.

## Implementation Review

Reviewed on 2026-07-22 against the approved story, `docs/product/kanban.md`,
decisions 0024 and 0025, the implementation diff, and the running authenticated
application.

### Acceptance Evidence

| Acceptance area | Result | Evidence |
| --- | --- | --- |
| Selected project heading and tabs | passed | Component test switches from `Study project` to `Exam prep`; browser proof creates multiple projects and observes the visible heading after selection. |
| Exact project-tab deletion | passed | Pointer right-click, Context Menu key, and `Shift+F10` paths capture the tab target. AlertDialog names the project, Cancel sends no request, pending confirmation is single-submit, and active deletion chooses the next board in list order. |
| Toolbar Add column | passed | Add column is at the far right of the Priority/Deadline row, reveals a focused required-name form, and the browser proof creates `Blocked`. |
| Right card detail panel | passed | Existing-card click and Add Card open the same labelled non-modal `<aside>`; title, description, priority, deadline, save, cancel/close, and edit-only delete are present. The centered editor modal is no longer rendered. |
| Focus and keyboard behavior | passed | Panel title receives focus, Escape closes, and card/Add Card triggers receive focus again. Project deletion supports keyboard context invocation. |
| Movement and realtime compatibility | passed | Explicit per-card Move and pointer drag remain outside the panel. `kanban-sync.spec.js` passed the existing `KanbanCardMoved` two-tab invalidation proof. |
| Card data boundary | passed | Cards render title, priority, deadline, and the retained Move control; no assignee, progress, tag, search, or panel Move field was added. |
| Responsive/local overflow | passed | Playwright passed at `1440x1000` and `1024x900` with the detail panel open and asserted no document-level horizontal overflow. Visual review showed three spacious desktop columns and locally clipped/scrollable columns at tablet width. |
| API/schema/architecture boundary | passed | Diff scan found no changes under `src/backend`, `kanban.api.ts`, or `useKanbanSync.ts`; no endpoint, DTO, migration, ownership, query-key, or SignalR event change was introduced. |
| Loading, empty, pending, and error states | passed | Existing loading/empty/error states remain; delete confirmation and card actions expose pending state. The non-empty-column notice remains visible and was changed to avoid intercepting panel clicks. |

### Commands And Results

```text
npm --prefix src/frontend run test:run -- src/features/kanban/pages/KanbanPage.test.tsx
  PASS: 1 file, 5 tests

npm --prefix src/frontend run test:run
  PASS: 28 files, 109 tests

src/frontend/node_modules/.bin/eslint.cmd \
  src/frontend/src/features/kanban \
  src/frontend/e2e/kanban-board.spec.js \
  src/frontend/e2e/productivity-responsive.spec.js
  PASS

src/frontend/node_modules/.bin/playwright.cmd test \
  e2e/kanban-board.spec.js \
  e2e/kanban-sync.spec.js \
  e2e/productivity-responsive.spec.js --workers=1
  PASS: 3 tests in 19.5 seconds

git diff --check -- <US-KANBAN-003 tracked files>
  PASS

git diff --name-only -- \
  src/backend \
  src/frontend/src/features/kanban/api \
  src/frontend/src/features/kanban/hooks/useKanbanSync.ts
  PASS: no output
```

### Release Constraints

- `npm --prefix src/frontend run lint` remains blocked by the pre-existing
  unrelated `RotateCw` unused import at
  `src/frontend/src/features/flashcards/pages/FlashcardViewerPage.tsx:1`.
- `npm --prefix src/frontend run build` remains blocked by the same pre-existing
  TypeScript `TS6133` error.
- These failures existed at the validation baseline, are outside
  `US-KANBAN-003`, and were not silently modified. Targeted Kanban lint, full
  unit tests, browser behavior, SignalR, and responsive proof all pass.
- No P1 or P2 finding remains in the Kanban story. The unresolved external build
  blocker keeps Harness platform proof at `0` until its owning work is fixed and
  the production build is rerun.

### Harness Proof State

| Layer | Value | Reason |
| --- | --- | --- |
| Unit | `1` | Focused 5 tests and full 109-test frontend suite passed. |
| Integration | `1` | Existing frontend API, query, backend, persistence, and SignalR boundaries were reused unchanged. |
| E2E | `1` | Kanban foundation, two-tab SignalR sync, and productivity responsive specs passed together. |
| Platform | `0` | Desktop/tablet browser proof passed, but the required production build is blocked by the unrelated Flashcard error above. |
