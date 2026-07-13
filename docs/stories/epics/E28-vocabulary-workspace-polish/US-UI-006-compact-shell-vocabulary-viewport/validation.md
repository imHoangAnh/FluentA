# US-UI-006 Validation

## Readiness Status

`READY WITH CONSTRAINTS`

Validated on 2026-07-13. This result authorizes only the implementation scope
of `US-UI-006` after explicit user approval. It does not authorize
`US-VOCAB-009`.

## Reality Gate

| Check | Evidence | Result |
| --- | --- | --- |
| Required code and commands exist | `AppShell.tsx`, `WorkspacePage.tsx`, `VocabTable.tsx`, focused Vitest, Vite build, and Playwright config are present and executable. | PASS |
| Architecture fit | The change stays in the shared AppShell and current Vocabulary presentation/state components. Decision 0046 already owns repository UI primitives and the shared-shell boundary. | PASS |
| Compatibility path | No API, schema, migration, DTO, route, query key, or persistence change is required. Existing autosave/keyboard behavior remains the compatibility contract. | PASS WITH CONSTRAINTS |
| Smallest coherent slice | Compact shell plus bounded Vocabulary layout can be demonstrated without the later destructive-action/feedback story. | PASS |
| Exit state is observable | Component tests can assert semantics/state; Playwright can measure scroll owners, sticky position, overflow, editor dimensions, and desktop/tablet shell output. | PASS |

## Current Baseline

Environment:

- Node `24.15.0`
- npm `11.16.0`
- React / React DOM `19.2.7`
- TypeScript `6.0.3`
- Vite `8.0.16`
- Tailwind Vite plugin `4.3.2`

Commands and results:

```text
npm --prefix src/frontend run lint
PASS

npm --prefix src/frontend run test:run
PASS - 9 files, 36 tests

npm --prefix src/frontend run build
PASS - CSS 104.66 kB (18.41 kB gzip), main JS 689.19 kB
       (204.14 kB gzip)

npm --prefix src/frontend run test:e2e -- e2e/design-system-milestone.spec.js
PASS - 2/2 Chromium scenarios at 1440x1000 and 1024x900
```

The production build retains two pre-existing warning families:

- SignalR `/*#__PURE__*/` annotations that Rolldown ignores because of their
  position.
- Main chunk larger than 500 kB after minification.

Neither warning blocks this frontend presentation story. Bundle output must be
recorded again after implementation so unexpected growth is visible.

## Bounded Browser Probes

Validation used disposable Playwright HTML/CSS probes without editing product
source.

### Nested viewport and sticky probe

With a `1000x800` viewport, a 56 px header, a fixed-height flex/grid chain,
forty rail items, thirty Word rows, and a 1200 px table:

| Observation | Result |
| --- | --- |
| Document scroll height | `800`, equal to viewport height |
| Board/Page tree owns vertical overflow | yes |
| Word rows own vertical overflow | yes |
| Word region retains horizontal overflow | yes |
| Sticky column-header movement after row scroll | `0px` |

This proves the planned containment pattern is executable when every flex/grid
ancestor in the height chain uses a bounded height and `min-height: 0` before
the intended overflow owners.

### Content-sized editor probe

The first probe used the common `height = scrollHeight` algorithm. A long
border-box textarea still reported inner overflow because the assigned height
did not include its 2 px border. A second probe used:

```text
border = offsetHeight - clientHeight
height = scrollHeight + border
```

Results:

| Editor | Client height | Scroll height | Inner overflow |
| --- | ---: | ---: | --- |
| Short content | 34 px | 34 px | no |
| Long wrapped content | 462 px | 462 px | no |

The short and long controls retain independent heights, while their grid row
can still clear the taller control.

## Feasibility Matrix

| Assumption | Risk | Evidence | Result |
| --- | --- | --- | --- |
| AppShell can become 56/184/84 without a route fork | Medium | Dimensions are currently centralized in `AppShell.tsx`; all protected product routes consume that component while auth uses `AuthShell`. | PASS |
| Tablet can remain forced collapsed | Low | Current `max-[1100px]` classes already force 84 px and hide the existing control; only desktop placement and expanded width change. | PASS |
| Rail and Word rows can scroll independently | High | Disposable browser probe kept document height equal to viewport while both collections owned vertical overflow. | PASS WITH CONSTRAINT C1 |
| Sticky column header can coexist with horizontal scrolling | High | Probe retained horizontal overflow and measured zero sticky-header movement after vertical scrolling. | PASS WITH CONSTRAINT C1 |
| Cells can show all wrapped content without equal-height controls | High | Border-compensated autosize probe produced independent 34 px/462 px controls with no inner overflow. | PASS WITH CONSTRAINT C2 |
| Autosize can preserve keyboard/autosave behavior | Medium | Existing tests lock Tab autosave, failed-draft Retry, final visible Example Enter -> new Word row, horizontal overflow, and resize handles. | PASS WITH CONSTRAINT C2 |
| Global shell regression is observable | Medium | Existing design-system Playwright passed Dashboard/Vocabulary at desktop/tablet; productivity-responsive already covers Todo, Habits, Countdowns, Kanban, and Pomodoro overflow. | PASS WITH CONSTRAINT C3 |
| Current frontend baseline is healthy | Low | Lint, 36 Vitest tests, production build, and 2 focused Chromium scenarios passed during this validation. | PASS |

## Implementation Constraints

### C1 - Preserve one explicit height and overflow chain

- The AppShell content column, route main region, Vocabulary workspace, right
  pane, table container, and rail must use compatible `min-h-0`/bounded-height
  rules.
- Only the Board/Page tree and Word-row region receive vertical scrolling.
- Keep the column header inside the vertical scroll owner with sticky `top: 0`.
- Preserve a horizontal scroll owner around the complete computed grid width.
- Acceptance must measure the actual running app; matching class names alone is
  insufficient.

### C2 - Autosize is presentation-only

- Resize only textarea-like controls; do not change Word DTOs or mutation
  timing.
- Account for border-box chrome rather than assigning raw `scrollHeight`.
- Recalculate after controlled draft/value changes and effective column-width
  changes so wrapping cannot leave stale height.
- Preserve current semantics: blur/Tab saves, Escape restores, Retry retains a
  failed draft, and Enter on the final visible Example cell moves focus to the
  blank Word row. Do not globally intercept textarea Enter.
- Add regression tests before treating editor replacement as complete.

### C3 - Prove shared-shell consumers, not only Vocabulary

- Extend AppShell/component proof for desktop collapse placement and accessible
  name.
- Re-run the existing design-system desktop/tablet scenario.
- Reuse the productivity-responsive route matrix after implementation to catch
  global width/clipping regressions.
- Add overflowing Vocabulary fixtures because the existing design-system test
  covers only the empty state.

### C4 - Keep this story dependency-light

- `US-UI-006` does not need context-menu, alert-dialog, or toast packages.
- Search/Filter can expose the approved disabled and `Coming soon` semantics
  without pulling `US-VOCAB-009` primitives forward.
- If a new runtime dependency becomes necessary, return to validation and
  record its React 19/bundle compatibility before installing it.

### C5 - Browser acceptance needs an explicit local runtime

- No API or Vite service was listening before validation.
- The mock-backed E2E baseline passed after launching a disposable hidden Vite
  process and stopping it after Playwright completed.
- Layout acceptance can remain mock-backed; real API proof belongs to the later
  deletion story. Any API-backed Vocabulary regression run must first prove the
  local API/database services are actually available.

## Acceptance Proof Required After Implementation

| Layer | Expected proof |
| --- | --- |
| Unit / component | AppShell dimensions/control semantics; exact toolbar composition; disabled Search/Filter description; cell autosize/dividers; all existing autosave/keyboard cases. |
| Route | Representative protected routes remain reachable and usable inside the compact shell; AuthShell remains unchanged. |
| E2E Chromium | Desktop/tablet AppShell; independent Board/Page and Word scrolling; sticky toolbar/header; long content fully visible without cell scrollbars; horizontal table scroll retained. |
| Accessibility | Icon control accessible name, disabled placeholder description, visible focus, reduced-motion compatibility. |
| Platform | Focused lint, full frontend Vitest, production build, bundle comparison, and `git diff --check`. |

Expected command shape:

```powershell
npm --prefix src/frontend run lint
npm --prefix src/frontend run test:run
npm --prefix src/frontend run build
npm --prefix src/frontend run test:e2e -- e2e/design-system-milestone.spec.js e2e/productivity-responsive.spec.js e2e/vocab-workspace-polish.spec.js
git diff --check
```

## Exact Authorized Story

After explicit execution approval, implementation may modify only what is
needed to deliver `US-UI-006 - Compact AppShell and stabilize Vocabulary
viewport`, including its focused tests and product/story documentation.

Board/Page context menus, confirmation modals, Word delete replacement,
success toasts, and any overlay/toast dependencies remain outside this
authorization under `US-VOCAB-009`.

## Implementation Review - 2026-07-13

`IMPLEMENTED`

### Delivered Files

- `src/frontend/src/components/AppShell.tsx`
- `src/frontend/src/routes/workspace/WorkspacePage.tsx`
- `src/frontend/src/components/vocabulary/VocabTable.tsx`
- `src/frontend/src/components/vocabulary/ColumnSettings.tsx`
- `src/frontend/src/components/vocabulary/VocabTable.test.tsx`
- `src/frontend/e2e/vocab-workspace-polish.spec.js`
- `docs/product/vocabulary-board.md`

### Acceptance Reconciliation

| Approved behavior | Delivered evidence |
| --- | --- |
| Compact shared AppShell | AppShell now has a 56 px header, 184 px expanded sidebar, unchanged 84 px collapsed/tablet sidebar, and an icon-only desktop control beside the logo. |
| AppShell scope | `AppShell.tsx` remains the one shared protected-route shell; `AuthShell` was not changed. |
| Stable Vocabulary viewport | Workspace main receives the remaining viewport height. The Board/Page rail and table use bounded `min-h-0` flex/grid chains and independent overflow owners. |
| Sticky/scroll behavior | The table scroll container owns vertical and horizontal overflow; its column header is sticky. The rail heading/create action remain outside its scrolling tree. |
| Toolbar | The Board eyebrow and Table View action are removed. The toolbar is Page name, disabled Search, disabled Filter, then Setting Columns. Both placeholders expose `Coming soon`. |
| Readable cells | Fixed text cells render as auto-sized wrapped textareas, compensate for border-box height, retain compact short controls, and use high-contrast column dividers. |
| Spreadsheet compatibility | Existing autosave, Retry, Tab, Escape, final-cell Enter, wide table, and resize tests stay green. Single-line field Enter remains prevented so the conversion to wrapped textarea does not add newline behavior. |

### Verification Results

```text
npm --prefix src/frontend run test:run -- src/components/vocabulary/VocabTable.test.tsx
PASS - 1 file, 6 tests

npm --prefix src/frontend run test:e2e -- e2e/vocab-workspace-polish.spec.js
PASS - 1 Chromium scenario at 1440x1000 and 1024x900
       proves 56 px header, 184/84 px sidebar states, icon control,
       disabled toolbar placeholders, independent rail/Word overflow,
       sticky table header, horizontal scroll, and a long cell with no
       internal scrollbar

npm --prefix src/frontend run test:run
PASS - 9 files, 37 tests

npm --prefix src/frontend run lint
PASS

npm --prefix src/frontend run build
PASS - CSS 105.35 kB (18.52 kB gzip), main JS 690.27 kB
       (204.52 kB gzip)

git diff --check
PASS
```

### Visual Review

The focused Chromium scenario captured desktop and tablet screenshots with a
long Page tree and 30 long Word rows. Visual review confirmed that the toolbar
and column header stay visible, the rail scrolls independently, fixed columns
remain separated, and the table retains horizontal overflow rather than
compressing content.

### Known Warnings And Exclusions

- The production build retains existing SignalR pure-annotation warnings and a
  main-chunk-size warning. The build succeeds; this story adds no runtime
  dependency and does not change that warning family.
- API-backed deletion, confirmation dialogs, context menus, and success toasts
  were intentionally not implemented. They remain `US-VOCAB-009`.
- The wider API-backed productivity responsive suite was not rerun because no
  local API/database runtime was listening. The mock-backed shared-shell and
  Vocabulary Chromium scenario passed; no claim of live backend proof is made
  for this frontend-only story.

### Review Findings

No P1 or P2 findings. The preserved pre-existing build warnings are P3 release
debt and are recorded above.
