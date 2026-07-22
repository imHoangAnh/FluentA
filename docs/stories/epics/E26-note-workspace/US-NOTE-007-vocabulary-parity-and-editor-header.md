# US-NOTE-007 Vocabulary Parity And Editor Header

## Status

implemented

## Lane

normal

## Change Boundary

Align the existing Notes board/page management presentation with Vocabulary
and move the existing rich-text formatting toolbar into the selected page
header. Preserve Note ownership, CRUD APIs, autosave, image upload, page-switch
save, sanitization, and deletion behavior.

## Existing Behavior

- Notes already exposes owner-scoped Create, Rename, and Delete APIs for boards
  and pages.
- Notes already uses right-click context menus for Rename and Delete, with a
  rename dialog and destructive confirmation dialog.
- Unlike Vocabulary, Notes currently renders Create Board and Create Page as
  inline forms inside the workspace.
- The rich-text toolbar currently renders inside the editor shell, below the
  selected page title/date/save header.

## Locked Decisions

- `D1` — Create Board and Create Page open focused modal dialogs matching the
  Vocabulary interaction pattern. The Note Board dialog requests only the Note
  board name because Notes has no language contract.
- `D2` — Rename Board/Page and Delete Board/Page remain available from the
  right-click menu. Rename uses a modal; Delete uses a confirmation modal.
- `D3` — On wide screens, the formatting toolbar shares the selected page
  header: title/date on the left, formatting controls in the middle, and
  Saved/Save actions on the right.
- `D4` — On narrow screens, the same header may wrap into multiple rows so the
  complete toolbar remains usable without creating whole-page horizontal
  overflow.
- `D5` — Reuse the existing Note APIs, cache keys, rich-text commands, image
  handling, autosave, page-switch save, and validation contracts. No backend,
  route, DTO, schema, migration, or new editor capability is authorized.
- `D6` — The editable document surface has no visible border in either idle or
  focused state. Keyboard focus, caret visibility, editing, and accessibility
  remain functional without introducing a replacement focus ring around the
  entire document canvas.

## Acceptance Direction

- Board and page creation no longer expands inline forms in the workspace.
- Create, Rename, and Delete interactions are keyboard-accessible and restore
  focus to a sensible Notes control after closing.
- The complete existing toolbar remains functional after moving into the page
  header.
- Editor content starts directly below the page header; no duplicate toolbar
  remains in the editor body.
- The editable document canvas remains visually borderless before, during, and
  after focus.
- Notes remains usable without whole-page horizontal overflow at narrow,
  tablet, and desktop widths.
- Dirty drafts remain visible on save failure, and switching boards/pages still
  waits for a successful save.

## Explicit Exclusions

- Search, tags, sharing, templates, file-picker upload, and attachments.
- New formatting commands or replacement of the shared Journal editor engine.
- Changes to Vocabulary behavior.
- Backend or persistence changes.

## Recommended Implementation Path

1. Replace the two Notes inline creation forms with Notes-owned Board and Page
   dialogs that mirror Vocabulary's modal interaction without importing across
   feature boundaries or adding a language field to Note boards.
2. Preserve the existing right-click Rename/Delete paths and add Vocabulary-
   equivalent fallback focus restoration after a deleted board or page removes
   its former trigger.
3. Extend the shared `JournalRichTextEditor` with an optional external toolbar
   host. The default inline toolbar remains unchanged for Journal; Notes portals
   the same toolbar instance into its selected-page header.
4. Build the Note header as a responsive three-zone layout: title/date,
   formatting toolbar, then save state/action. Let zones wrap at narrow widths
   without hiding controls or widening the page.
5. Apply Notes-local borderless utility selectors around the editor shell and
   editable surface. Do not edit the already-dirty global
   `src/frontend/src/styles/design-system.css`.
6. Update focused component/browser tests, `docs/product/notes.md`, Harness
   evidence, and the E26 current-story artifacts.

## Rejected Alternatives

- Import Vocabulary creation dialogs directly into Notes. Rejected because the
  Vocabulary board dialog owns a language field and would couple two feature
  boundaries for presentation-only parity.
- Duplicate the rich-text toolbar commands inside Notes. Rejected because two
  command implementations could drift and would risk Journal/Notes behavior
  divergence.
- Move the toolbar with CSS-only absolute positioning. Rejected because focus,
  wrapping, DOM reading order, and responsive proof would become brittle.
- Modify the dirty global design-system stylesheet. Rejected because Notes can
  enforce the approved borderless canvas with local utilities while preserving
  unrelated user changes.

## Integration Boundaries

- Frontend only; existing Note endpoints and React Query keys remain unchanged.
- `JournalRichTextEditor` receives one backward-compatible optional placement
  seam; its default Journal rendering and command set remain unchanged.
- No Vocabulary source behavior changes.
- No database, backend, route, DTO, schema, migration, storage, or dependency
  changes.

## Expected Files

- `src/frontend/src/features/notes/pages/NotesPage.tsx`
- `src/frontend/src/features/notes/pages/NotesPage.test.tsx`
- Notes-local creation/focus components under
  `src/frontend/src/features/notes/components/`
- `src/frontend/src/features/journal/components/JournalRichTextEditor.tsx`
- focused Note browser proof under `src/frontend/e2e/`
- `docs/product/notes.md`
- `docs/stories/epics/E26-note-workspace/**`

## Risk And Required Proof

| Risk | Cause | Required proof |
| --- | --- | --- |
| Journal regression | Shared editor gains an optional toolbar host | default inline toolbar assertion plus app/build regression |
| Formatting failure | Portaled toolbar must still target the active editable element | focused toolbar command interaction in Notes |
| Autosave race | Clicking a header toolbar moves focus out of the editor | existing blur/page-switch/error-retention tests remain green |
| Focus loss after deletion | The right-click trigger can disappear after success | dialog Cancel and delete-success fallback-focus tests |
| Narrow overflow | Title, full toolbar, and Save share one header | browser proof at 320, 768, 1024, and 1440 pixels |
| Dirty-worktree overlap | global CSS contains unrelated edits | exclude it and perform a scoped diff review |

## Execution Plan

1. Baseline focused Notes and app route tests; confirm the shared dialog and
   portal seams compile in the current frontend runtime.
2. Add Notes creation dialogs and reconcile open/close/error/focus state.
3. Add the optional shared-editor toolbar host and move the Notes toolbar into
   the selected-page header.
4. Remove the Notes editor canvas border locally and tune responsive wrapping.
5. Expand focused tests for creation modals, toolbar placement, formatting,
   borderless focus, CRUD dialogs, fallback focus, and preserved autosave.
6. Run focused Vitest, targeted ESLint, production build, four-width Playwright,
   scoped `git diff --check`, product-doc reconciliation, Harness story proof,
   and trace.

## Verification Commands

```powershell
npm --prefix src/frontend run test:run -- src/features/journal/components/JournalRichTextEditor.test.tsx src/features/notes/pages/NotesPage.test.tsx src/test/app/App.test.tsx
npm --prefix src/frontend exec eslint -- src/features/notes src/features/journal/components/JournalRichTextEditor.tsx src/test/app/App.test.tsx
npm --prefix src/frontend run build
npm --prefix src/frontend run test:e2e -- e2e/notes-vocabulary-parity.spec.js
git diff --check -- docs/product/notes.md docs/stories/epics/E26-note-workspace src/frontend/src/features/notes src/frontend/src/features/journal/components/JournalRichTextEditor.tsx src/frontend/src/test/app/App.test.tsx src/frontend/e2e/notes-vocabulary-parity.spec.js
```

## Readiness Assumptions

| Assumption | Risk | Evidence required before source work |
| --- | --- | --- |
| Notes CRUD contracts already support the requested UI | Existing behavior | current Note API adapters and component tests |
| A toolbar portal can preserve the same editor command state | Shared component | bounded prototype or compile/test evidence |
| Border removal can remain Notes-local | Dirty overlap | selector inspection and scoped plan excluding global CSS |
| Browser proof can observe the layout | Platform | live Vite runtime or deterministic Playwright fixtures |

## Readiness Validation

Result: `READY WITH CONSTRAINTS`

| Assumption | Risk | Evidence | Result |
| --- | --- | --- | --- |
| Existing Notes CRUD supports presentation-only parity | Existing behavior | `note.api.ts` already exposes create/update/delete for boards and pages; focused Notes/App baseline passed 21/21 | ready |
| Shared editor can expose the same toolbar through a portal | Shared component | installed React DOM exports `createPortal` at runtime and its TypeScript declaration is present; no package change required | ready |
| Journal can keep its current layout | Regression | the planned toolbar host is optional and defaults to the current inline toolbar path | ready with focused regression requirement |
| Border removal can remain Notes-local | Dirty overlap | editable content already has `outline: none`; Notes can add local `border-0`/`focus-within:outline-none` selectors without editing the dirty global stylesheet | ready |
| Responsive browser proof is executable | Platform | the repo Vite process is live on `localhost:5173`; existing Note Playwright patterns and deterministic API routing are available | ready |
| Repository production build is a clean baseline | External worktree | TypeScript stops on the unrelated unused `RotateCw` import in dirty `FlashcardViewerPage.tsx:1` | constrained; use story-isolated build proof and report the global blocker |

Baseline evidence:

- Vitest: PASS — `NotesPage.test.tsx` plus `App.test.tsx`, 2 files and
  21 tests.
- Targeted ESLint: PASS — Notes, the shared editor component, and App tests.
- Portal availability probe: PASS — `createPortal` is a runtime function and
  has installed TypeScript types.
- Production build: BLOCKED OUTSIDE STORY — unused `RotateCw` import in the
  dirty Flashcard Viewer file; no Note source was changed during validation.
- Worktree constraint confirmed — `design-system.css` is dirty and remains
  excluded from the story.

## Delivery Gate

The plan was approved and the readiness result was `READY WITH CONSTRAINTS`.
Implementation and review are complete; durable proof is recorded in the
story-owned `validation.md` artifact and Harness matrix row.
