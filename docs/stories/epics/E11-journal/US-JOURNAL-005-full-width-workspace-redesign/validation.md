# Validation

## Status

`IMPLEMENTED` on 2026-07-22. The approved Journal workspace is proven by
focused unit/regression tests, live API-backed browser flows, responsive
screenshots, targeted lint, and a production Vite bundle. Two pre-existing,
out-of-scope repository constraints remain recorded below and do not invalidate
the story-owned proof. Harness unit, integration, and E2E flags are `1`; the
platform flag remains `0` because the repository's required combined
TypeScript/Vite build command is not fully green.

## Feasibility Matrix

| Assumption | Risk | Evidence | Result |
| --- | --- | --- | --- |
| Journal can consume all AppShell content without a shell change. | A global shell edit could regress every protected route. | The route-local content class already opted out of base padding. Final browser proof exposed AppShell's responsive `lg:p-8`, so Journal now adds the equally route-local `lg:p-0`; the obsolete Journal margin and editor cap are removed without touching AppShell. | ready |
| The approved redesign is frontend-only. | A hidden API or persistence dependency could expand scope. | Search, calendar, CRUD, autosave, and delete mutations already live in `JournalPage.tsx`; the planned change only reorders existing controls and scoped layout selectors. | ready |
| Shared rich-text behavior does not need to change. | Broad editor changes could regress Notes. | Existing inline-toolbar contract and Notes integration baseline passed `11/11` focused Vitest tests; the shared editor remains a regression-only dependency. | ready |
| The target source can be linted independently. | Dirty unrelated files could hide story errors. | Targeted ESLint passed for current Journal page/editor/editor test and Notes page test. | ready |
| Production build can be used as final platform proof. | An unrelated dirty-worktree error can block the global build. | Current build reaches TypeScript and stops only at unused `RotateCw` in `FlashcardViewerPage.tsx:1`, outside this story. | constrained |
| Existing browser flows are executable. | Current dev host binding or flaky thresholds could create false negatives. | Playwright `1.56.1` is installed; API is reachable; a temporary Vite bound to `127.0.0.1:5173` ran Journal foundation CRUD successfully `1/1`. Rich-text smoke reached Journal but its pre-existing `<500ms` assertion measured `793ms`. | constrained |
| One story is the smallest coherent slice. | Splitting presentation layers could produce non-demonstrable partial work. | Search placement, rail sizing, editor header, toolbar/content order, and overflow proof form one approved user-visible workspace. | ready |
| No destructive migration path is required. | Delete behavior could become unsafe during UI movement. | No API/schema change is planned and the existing accessible delete confirmation remains mandatory. | ready |

## Baseline Results

| Check | Result | Evidence |
| --- | --- | --- |
| Focused Journal/Notes Vitest | pass | 2 files, 11 tests passed. |
| Targeted ESLint | pass | Journal page/editor/editor test and Notes page test produced no findings. |
| Frontend production build | constrained | Fails on unrelated unused `RotateCw` import in `src/features/flashcards/pages/FlashcardViewerPage.tsx:1`. |
| Journal foundation Playwright | pass | 1/1 CRUD, Unicode, ordering, ownership, and confirmation-gated delete smoke passed. |
| Journal rich-text Playwright | constrained | Functional flow opened Journal; pre-existing editor-load assertion failed at `793ms` versus `<500ms`. |
| Service reachability | constrained | API is reachable on `127.0.0.1:5000`; the existing Vite process serves `localhost:5173`, so browser specs that hard-code `127.0.0.1` require a temporary Vite bound to that address. |

## Proof Strategy

Prove the approved layout structurally and visually, then rerun the existing
Journal workflows that the markup refactor could disturb. Add a Notes regression
check because shared editor styles are an integration boundary even though the
shared component is not an intended implementation target.

## Test Plan

| Layer | Expected proof |
| --- | --- |
| Unit | Journal page has no visible `My Journal`; search is first; entries expose only title/date; editor order is title/date/Save/Delete/toolbar/content; footer stats are absent; status remains available. |
| Integration | Existing React Query-backed create/open/update/delete, search, and calendar interactions keep their current API contracts. No backend integration change is expected. |
| E2E | At 1440/1024/768/320 widths, the page fills available AppShell content, Save precedes Delete, recent rows have no badge/preview, writing surface is borderless, and `scrollWidth <= clientWidth`. |
| Regression | Journal foundation, rich-text/autosave, search, calendar, shared editor, and Notes editor tests remain green. |
| Platform | Targeted ESLint, TypeScript/Vite production build, Chromium screenshots, and scoped diff checks. |

## Planned Commands

```powershell
npm --prefix src/frontend run test:run -- src/features/journal/pages/JournalPage.test.tsx src/features/journal/components/JournalRichTextEditor.test.tsx src/features/notes/pages/NotesPage.test.tsx
Push-Location src/frontend; npm exec -- eslint src/features/journal/pages/JournalPage.tsx src/features/journal/pages/JournalPage.test.tsx; Pop-Location
npm --prefix src/frontend run build
npm --prefix src/frontend run test:e2e -- e2e/journal-workspace-redesign.spec.js
npm --prefix src/frontend run test:e2e -- e2e/journal-foundation.spec.js e2e/journal-rich-text-autosave.spec.js e2e/journal-search.spec.js e2e/journal-calendar.spec.js
git diff --check -- docs/product/journal.md docs/stories/epics/E11-journal/US-JOURNAL-005-full-width-workspace-redesign src/frontend/src/features/journal/pages/JournalPage.tsx src/frontend/src/features/journal/pages/JournalPage.test.tsx src/frontend/src/styles/design-system.css src/frontend/e2e/journal-workspace-redesign.spec.js
.\scripts\bin\harness-cli.exe story verify US-JOURNAL-005
```

## Required Browser Assertions

- AppShell's navigation width is not duplicated by Journal margin or padding.
- Journal root reaches the available right edge within normal AppShell padding
  rules and the editor grows with viewport width.
- Search is left aligned and `My Journal` is not visibly rendered.
- Calendar and recent entries remain readable and selectable.
- Entry title is above its date; Save is immediately before Delete.
- Formatting toolbar precedes the editable content in DOM and visual order.
- The content shell has no visible idle border and focus does not outline the
  entire writing canvas.
- Word/character footer and `ENTRY` badge are absent.
- No whole-page horizontal overflow exists at each required viewport.

## Evidence

### Acceptance Review

| Criterion | Evidence | Result |
| --- | --- | --- |
| 1. Journal fills AppShell content and the editor grows beyond the old centered cap. | `journal.routes.tsx` now uses `max-w-none p-0 lg:p-0`; the responsive Playwright spec compares Journal and `#main-content` widths, holds the rail at no more than 260px on desktop, and confirms the editor is wider than the rail. | pass |
| 2. Search is left aligned and `My Journal` is absent. | Focused Vitest and Playwright both assert search precedes the workspace and exact visible `My Journal` text has count zero. | pass |
| 3. Recent rows show one title and one full date only. | `JournalPage` renders one highlighted title element and one formatted date; tests assert one title occurrence and no `ENTRY` badge. | pass |
| 4. Editor order is title, date, Save, Delete, toolbar, content. | Unit and browser DOM-order assertions verify every adjacent boundary; Delete remains persisted-entry-only and the existing confirmation dialog is unchanged. | pass |
| 5. Save state remains beside actions. | `journal-save-status` moved into the header action group with `role=status` and `aria-live=polite`; focused test observes `Saved` and deterministic autosave observes `Unsaved changes`. | pass |
| 6. Writing surface has no idle or full-canvas focus border. | Journal-scoped CSS removes shell/content borders and the responsive browser test focuses the editor, then confirms all border widths are `0px` and both outlines are absent. Actionable controls retain the global focus-visible treatment. | pass |
| 7. No whole-page horizontal overflow at 1440, 1024, 768, or 320 CSS pixels. | New Playwright proof checks `documentElement.scrollWidth <= clientWidth` and visibility of search, calendar, entries, header, toolbar, and writing surface at all four widths; screenshots were visually inspected. | pass |
| 8. Existing workflows and shared editor consumers remain compatible. | Journal foundation/search/calendar browser specs pass 3/3; focused Journal page/editor and Notes tests pass 13/13. A deterministic page test separately proves the unchanged two-second autosave call. | pass |

### Commands And Results

| Command | Result |
| --- | --- |
| `npm run test -- --run src/features/journal/pages/JournalPage.test.tsx src/features/journal/components/JournalRichTextEditor.test.tsx src/features/notes/pages/NotesPage.test.tsx` from `src/frontend` | pass: 3 files, 13 tests |
| `npx eslint` over the changed Journal page/test/route/new E2E plus shared-editor and Notes regression files | pass: no findings |
| `npx playwright test e2e/journal-workspace-redesign.spec.js --reporter=line` | pass: 1/1; live API-backed proof at 1440, 1024, 768, and 320 widths |
| `npx playwright test e2e/journal-foundation.spec.js e2e/journal-search.spec.js e2e/journal-calendar.spec.js e2e/journal-rich-text-autosave.spec.js --reporter=line` | 3 passed; rich-text spec stopped only at its pre-existing performance assertion, measuring 663ms against `<500ms` |
| `npx vite build` | pass: 2,104 modules transformed; known SignalR/Rolldown annotation warnings only |
| `npm run build` | constrained outside story: TypeScript stops at unused `RotateCw` in `FlashcardViewerPage.tsx:1` before Vite |
| `git diff --check` over story-owned code/docs | pass |

### Story-Owned Files

- `docs/product/journal.md`
- `docs/stories/epics/E11-journal/US-JOURNAL-005-full-width-workspace-redesign/overview.md`
- `docs/stories/epics/E11-journal/US-JOURNAL-005-full-width-workspace-redesign/design.md`
- `docs/stories/epics/E11-journal/US-JOURNAL-005-full-width-workspace-redesign/execplan.md`
- `docs/stories/epics/E11-journal/US-JOURNAL-005-full-width-workspace-redesign/validation.md`
- `src/frontend/src/features/journal/journal.routes.tsx`
- `src/frontend/src/features/journal/pages/JournalPage.tsx`
- `src/frontend/src/features/journal/pages/JournalPage.test.tsx`
- Journal-scoped rules in `src/frontend/src/styles/design-system.css`
- `src/frontend/e2e/journal-workspace-redesign.spec.js`

No API, DTO, backend, database, migration, AppShell, shared-editor contract, or
Notes implementation file changed for this story.

## Known Baseline And Gaps

- The worktree already contains unrelated frontend and documentation changes,
  including shared editor and design-system work. Validation must distinguish
  story-owned diffs from that baseline.
- Browser proof requires Vite and the API to be listening; if unavailable, the
  exact missing runtime and deferred proof must be reported rather than marked
  passed.
- The repository Playwright configuration has no named `chromium` project, so
  focused commands must not add `--project=chromium`.
- Existing Journal browser specs use `127.0.0.1`; start the implementation proof
  Vite process with `--host 127.0.0.1` rather than relying on a `localhost`-only
  listener.
- The existing `<500ms` rich-editor loading assertion is a known baseline
  constraint. It measured `663ms` during the final regression run and was not
  weakened inside this story. The unchanged two-second autosave mutation is
  covered deterministically in `JournalPage.test.tsx`.
- The full `npm run build` still stops at an unrelated unused `RotateCw` import
  in `FlashcardViewerPage.tsx:1`. The story-owned production bundle was proven
  separately with `npx vite build` and live Chromium execution.
