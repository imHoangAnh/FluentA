# US-VOCAB-009 Validation

## Readiness Status

`READY WITH CONSTRAINTS` - validated 2026-07-13. Implementation still requires
explicit user approval.

The existing frontend and Vocabulary backend regression baseline are green.
The proposed focused packages support the repository's React 19 runtime and
the approved interaction contract. No backend, API, schema, ownership, or
cleanup change is required.

## Reality Gate

### Existing implementation surface

- `WorkspacePage.tsx` already owns Board/Page selection and create mutations.
  It derives Boards and Pages newest-first by `createdAt`, then ID, so the
  approved replacement is deterministic.
- `vocabulary.api.ts` already exposes `deleteBoard(boardId)`,
  `deletePage(boardId, pageId)`, and `deleteWord(boardId, wordId)` with the
  required current endpoints.
- `VocabTable.tsx` already removes a successfully deleted Word from only the
  active Page's Word cache. Its remaining gap is browser-native
  `window.confirm`.
- `main.tsx` is the stable app-root location for exactly one toast viewport.
- No local API, Vite, PostgreSQL, or Redis listener was present on ports 5000,
  5173, 5432, or 6379 during validation, and Docker Desktop was not running.
  Therefore real API-backed Chromium proof is an implementation/closeout
  constraint, not validation evidence.

### Focused package compatibility

| Package | Validated version | React compatibility | Contract fit |
| --- | --- | --- | --- |
| `@radix-ui/react-context-menu` | `2.3.3` | React/React DOM 16.8 through 19 | Pointer context menu, semantic menu roles, controlled open state, keyboard navigation, managed focus. |
| `@radix-ui/react-alert-dialog` | `1.1.19` | React/React DOM 16.8 through 19 | Modal focus trap, labelled title/description, Cancel/Action semantics, Escape, controlled open state. |
| `sonner` | `2.0.7` | React/React DOM 18 through 19 | Bottom-right viewport, duration, explicit close, polite live region, success API, stacked toasts. |

Primary references:

- Radix Context Menu documentation:
  <https://www.radix-ui.com/primitives/docs/components/context-menu>
- Radix Alert Dialog documentation:
  <https://www.radix-ui.com/primitives/docs/components/alert-dialog>
- Sonner package and usage documentation: <https://github.com/emilkowalski/sonner>

A disposable inspection of the published Sonner `2.0.7` package confirmed
that new toasts are prepended to its internal list, index zero is anchored to
the bottom for a bottom-positioned viewport, the default position is
`bottom-right`, and the rendered region uses `aria-live="polite"`. It also
exposes `duration`, `closeButton`, and `closeButtonAriaLabel`. Therefore a
single repository wrapper can set `duration={3000}`, `closeButton`, and
`position="bottom-right"` without custom global toast state.

No Tooltip package is required by this story. The approved delete and toast
behavior is covered by Context Menu, Alert Dialog, and Sonner; adding another
runtime would expand scope without acceptance value.

## Locked Implementation Constraints

### Exact target capture

Use one discriminated target type and render the confirmation entirely from
that captured value, for example:

```ts
type DeleteTarget =
  | { kind: 'board'; boardId: string; name: string }
  | { kind: 'page'; boardId: string; pageId: string; name: string }
  | { kind: 'word'; boardId: string; pageId: string; wordId: string; name: string }
```

Right-click must select the Board/Page before its menu becomes visible. The
modal and mutation must never re-read the target ID from later active state.

### Safe overlay focus

Radix normally restores focus to the element focused before the Alert Dialog
opened. That works on Cancel because the Board/Page/Word remains. It is unsafe
after success because the confirmed trigger is removed.

Implementation must therefore:

1. Let Cancel/Escape close normally and restore focus to the unchanged trigger.
2. Disable the destructive action while the mutation is pending.
3. On successful deletion, prevent default close autofocus and focus a stable,
   surviving fallback: the replacement Board/Page control when available, or
   the relevant rail/table region for a final-item delete.
4. Prove the Context Menu to Alert Dialog handoff with keyboard and pointer
   tests; if synchronous opening races the menu's close autofocus, defer dialog
   opening until the menu close completes rather than adding a hidden trigger.

### Atomic selection and cache transition

Do not rely on invalidation alone. An invalidation leaves deleted data in the
cache until refetch completes and can briefly reselect it through the existing
fallbacks.

- **Board success:** synchronously filter the deleted Board from
  `['vocab', 'boards']`, compute the newest replacement from that filtered
  collection, set `selectedBoardId` to its ID or `null`, clear
  `selectedPageId`, remove the deleted Board detail and its Page Word queries,
  then invalidate the Board list for server reconciliation.
- **Page success:** read/filter the current Board detail synchronously, compute
  the newest remaining Page, write the filtered detail cache, set
  `selectedPageId` to its ID or `null`, remove the deleted Page's Word query,
  then invalidate the Board list/detail for server reconciliation.
- **Word success:** retain the existing current-Page cache filter.
- Selection and caches change only after endpoint success. Cancel and failure
  preserve both state and target, and failure emits no success toast.

### Toast trigger boundary

Call `toast.success` only from successful Create Board/Page/Word and Delete
Board/Page/Word callbacks, using exact entity/result copy such as
`Board created successfully`. Do not place toast calls in shared cache helpers,
`saveCell`, preference updates, or generic API interceptors. This preserves the
approved exclusion of autosave and automatic preference persistence.

## Baseline Evidence

Executed 2026-07-13 from the repository root:

| Command | Result |
| --- | --- |
| `dotnet test src/backend/FluentA.Application.UnitTests/FluentA.Application.UnitTests.csproj --filter FullyQualifiedName~VocabularyServiceTests` | Passed `11/11`. |
| `npm --prefix src/frontend run lint` | Passed. |
| `npm --prefix src/frontend run test:run` | Passed `37/37` across 9 files. |
| `npm --prefix src/frontend run build` | Passed; existing SignalR pure-annotation and chunk-size warnings remain. |

## Implementation And Acceptance Proof

| Layer | Required proof before closeout |
| --- | --- |
| Unit / component | Exact captured target, right-click selection, menu/dialog roles and names, Cancel/Escape, pending single-request guard, endpoint IDs, atomic replacement/empty state, all six eligible toast triggers, and autosave/preference exclusions. |
| Backend regression | Re-run focused `VocabularyServiceTests`; no backend source change is expected. |
| E2E Chromium | With real API/database: multi-Board and multi-Page right-click delete, cancel/no request, exact confirm target, newest replacement, final empty states, Word modal, six create/delete toasts, bottom-right/newest-bottom placement, close and timed dismissal. |
| Accessibility | Dialog focus trap, safe Cancel restoration, safe post-delete fallback, keyboard Escape, semantic menu/dialog names, and non-focus-stealing polite toast announcement. |
| Platform | Dependency/lockfile review, focused and full tests, lint, production build and bundle delta, `git diff --check`. |

## Implementation Gate

Implementation may begin only after the user explicitly approves
`US-VOCAB-009`. Stop and return to planning if the work requires a new delete
endpoint, schema/cascade/ownership change, or custom parallel overlay/toast
state outside the validated focused-package boundary.

## Implementation Review - 2026-07-13

### Acceptance Evidence

| Acceptance area | Evidence |
| --- | --- |
| Board/Page context actions | `WorkspacePage.tsx` uses repository-owned Radix Context Menu wrappers. Right-click selects the visible target before opening `Delete Board` or `Delete Page`. |
| Exact confirmation and safe cancellation | The shared `DeleteConfirmationDialog` names the captured Board/Page/Word and exposes semantic Alert Dialog, Cancel, Escape, and a destructive pending-disabled action. `WorkspacePage.test.tsx` proves Board Cancel causes no request. |
| Correct delete endpoint and replacement | Board/Page mutations call the existing API methods with captured IDs, synchronously filter React Query data, calculate newest-first replacement, then invalidate for reconciliation. Component tests prove Board and Page replacement selection. |
| Word confirmation | `VocabTable.tsx` removes `window.confirm`; its test proves Cancel causes no request and Confirm calls `deleteWord(boardId, wordId)`. |
| Toast scope | One Sonner viewport is mounted in `main.tsx`. Successful Create/Delete Board/Page/Word callbacks call entity-specific success toasts; cell autosave and preference mutation callbacks have no toast call. |
| Chromium interaction | Mocked-API Chromium proof passes Board right-click, exact modal, Cancel/no DELETE, Confirm, replacement page, and bottom-right success toast. Existing desktop/tablet viewport proof remains green. |
| Product reconciliation | `docs/product/vocabulary-board.md` documents the context action, confirmation, replacement selection, scoped toast, and safe focus behavior. |

### Commands And Results

| Command | Result |
| --- | --- |
| `dotnet test src/backend/FluentA.Application.UnitTests/FluentA.Application.UnitTests.csproj --filter FullyQualifiedName~VocabularyServiceTests` | Passed `11/11`. |
| `npm --prefix src/frontend run test:run` | Passed `39/39` across 10 files. |
| `npm --prefix src/frontend run lint` | Passed. |
| `npm --prefix src/frontend run build` | Passed. Existing SignalR pure-annotation and chunk-size warnings remain. |
| `npm --prefix src/frontend run test:e2e -- e2e/vocab-workspace-polish.spec.js` | Passed `2/2` Chromium scenarios, using mocked existing API responses. |
| `git diff --check` | Passed; only repository line-ending notices were emitted. |

### Review Findings

- No P1 or P2 findings.
- No API, schema, ownership, cascade, SignalR, or autosave contract changed.
- Live API/database Chromium proof remains unavailable because Docker Desktop
  was not running and no local service listener was available. This is recorded
  as `integration=no`; mocked-browser interaction plus the existing focused
  backend service tests prove the frontend contract without claiming live
  integration evidence.
