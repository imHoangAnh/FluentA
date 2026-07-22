# Validation: US-NOTE-007 Vocabulary Parity And Editor Header

## Result

`PASS` — the approved frontend-only Notes presentation slice is implemented.
No backend, API, DTO, route, cache key, schema, migration, dependency, or
Vocabulary behavior changed.

## Acceptance Evidence

| Acceptance criterion | Evidence | Result |
| --- | --- | --- |
| Board/Page creation uses focused modal dialogs instead of inline forms | `NotesPage.test.tsx` creates a Board and Page through the new dialogs; deterministic Playwright checks initial focus, Cancel, successful Page creation, and immediate opening | pass |
| Rename/Delete remain on right-click with destructive confirmation | focused component tests cover Board and Page rename/delete; browser proof exercises Page rename/delete and Board delete confirmation | pass |
| Dialog focus returns to a sensible control | component tests verify renamed triggers regain focus and delete success focuses `notes-rail-scroll`; browser proof verifies Create/Delete Cancel and delete-success focus | pass |
| Complete existing toolbar is in the selected-page header | component proof asserts the single toolbar is portaled into `note-toolbar-host`, not the editor body; browser proof asserts both Heading 1 and Redo are in the viewport | pass |
| Formatting remains functional | component proof clicks Bold through the portaled toolbar and verifies the same `document.execCommand('bold')` path plus dirty save state | pass |
| Editable canvas is borderless idle and focused | Notes-local shell/content utilities are asserted in Vitest; Chromium computed styles are `border-width: 0px` and `outline-style: none` before and after focus | pass |
| Narrow-to-desktop layout has no whole-page horizontal overflow | deterministic Playwright passes at 320, 768, 1024, and 1440 pixels with full toolbar visibility and screenshot proof | pass |
| Autosave, page-switch ordering, error retention, and image insertion stay intact | existing Notes tests remain green for blur save, page-switch retry, dropped image persistence, and upload errors | pass |
| Journal keeps its default toolbar behavior | `JournalRichTextEditor.test.tsx` asserts the default toolbar remains inside the Journal editor shell; Notes is the only caller supplying an external host; TypeScript and production build pass in the story-isolated worktree | pass |

## Commands And Results

- Focused Vitest: `23/23` passed across `JournalRichTextEditor.test.tsx`,
  `NotesPage.test.tsx`, and `App.test.tsx`.
- Targeted ESLint: passed for Notes, `JournalRichTextEditor.tsx`,
  `RenameEntityDialog.tsx`, and App route tests.
- Deterministic Playwright: `4/4` passed at 320, 768, 1024, and 1440 pixels in
  `notes-vocabulary-parity.spec.js`.
- Story-isolated TypeScript plus Vite production build: passed; 2,095 modules
  transformed and the Notes chunk emitted.
- Worktree-wide TypeScript build: blocked outside this story by the pre-existing
  unused `RotateCw` import in the dirty
  `features/flashcards/pages/FlashcardViewerPage.tsx:1`.
- Scoped `git diff --check` plus untracked story-file whitespace checks:
  passed.

## Warnings And Constraints

- The isolated Vite build emitted the existing third-party SignalR/Rolldown
  pure-annotation warnings. They did not fail the build.
- The already-dirty `src/frontend/src/styles/design-system.css` was not edited
  by this story.
- The existing live-backend `notes-workspace.spec.js` selector was reconciled
  from `Create` to `Create board`; deterministic presentation proof does not
  mutate backend data.
- No migration or database runtime proof is applicable because the story is
  frontend-only and preserves persistence contracts.

## Reconciled Files

- Notes creation, focus, layout, and editor composition under
  `src/frontend/src/features/notes/`.
- Backward-compatible optional toolbar placement in
  `src/frontend/src/features/journal/components/JournalRichTextEditor.tsx`.
- Optional focus-return seam in
  `src/frontend/src/shared/components/RenameEntityDialog.tsx`.
- Focused Vitest and deterministic four-width Playwright proof.
- `docs/product/notes.md` and the E26 story packet.
