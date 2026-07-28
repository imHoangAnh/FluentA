# Validation

## Status

READY WITH CONSTRAINTS

## Reality Gate

| Assumption | Risk | Evidence | Result |
| --- | --- | --- | --- |
| Kanban can opt out of the shared width cap locally. | A global AppShell edit could change unrelated routes. | `appShellRoute` already accepts `contentClassName`; Journal, Notes, Vocabulary, and Habits use route-local full-width classes. | Ready: use only Kanban route metadata. |
| The reference can be represented without new product capabilities. | Decorative or unsupported controls could imply APIs that do not exist. | `kanban.api.ts` and `docs/product/kanban.md` support project/column/card CRUD, Move, Priority, and Deadline; the contract explicitly excludes Search and Assignee. | Ready: omit unsupported controls. |
| Current behavior has a stable regression baseline. | Presentation changes could break Trash mutations or panel focus. | Focused Vitest passed `5/5`; focused Kanban ESLint passed; the production build passed before source edits. | Ready: extend rather than replace tests. |
| Width and overflow are observable. | Unit tests do not calculate CSS layout. | Existing Playwright infrastructure and responsive spec already inspect document overflow; a deterministic mocked-API spec can also compare route/workspace/column bounds. | Ready with browser proof required. |
| Existing dirty work can be preserved. | E35 already changed Kanban deletion and shared CSS. | The scoped diff shows Trash return values, Undo toasts, and deletion flow in `KanbanPage`; new work can avoid these lines and edit Kanban CSS selectors only. | Ready with constrained diff review. |

## Baseline Commands

```text
npm run test:run -- src/features/kanban/pages/KanbanPage.test.tsx
PASS: 1 file, 5 tests

eslint KanbanPage.tsx KanbanPage.test.tsx kanban.routes.tsx
PASS

npm run build
PASS: TypeScript and Vite production bundle
NOTE: existing non-blocking SignalR/Rolldown PURE annotation warnings remain.
```

## Authorized Story

Implementation is limited to `US-KANBAN-004`: route-local width, Kanban markup,
Kanban styling, focused tests/browser proof, and matching product/story docs.
No API, backend, schema, deletion, ownership, or SignalR contract change is
authorized.

## Acceptance Review

| Acceptance criterion | Evidence | Result |
| --- | --- | --- |
| Route uses almost all available AppShell width. | Kanban route sets `h-screen max-w-none overflow-hidden` with compact responsive padding. Chromium at `1920x1080` asserted the AppShell main right edge is within `1px` of the viewport and the workspace within `20px`. | Pass |
| Supported hierarchy and actions only. | Component tests assert project navigation, selected heading/Add column, Priority/Deadline, and board order. Source and browser checks assert no Search, Assignee, or Clear filters control. | Pass |
| Three-column desktop fill. | Chromium measured every column wider than `380px` and the three-column span greater than 90% of the board client width. | Pass |
| Local overflow for additional columns. | The mocked Add column endpoint adds a fourth column; at `1024x900`, board `scrollWidth > clientWidth` while document `scrollWidth <= clientWidth`. | Pass |
| Useful empty states and early Add Card. | Component tests verify Add Card precedes `No cards yet` and its guidance. Browser screenshot verifies icon/title/count/action composition for To Do, In Progress, and Done. | Pass |
| Existing card detail behavior remains. | Existing create/edit/Move/focus component test remains green; Chromium opens the Create card panel at tablet width without document overflow. | Pass |
| No contract expansion. | Implementation changed route metadata, page presentation, Kanban CSS, tests, and docs only. API adapters, backend, DTOs, schema, ownership, deletion, and SignalR code were not changed by this story. | Pass |

## Final Proof

```text
harness-cli story verify US-KANBAN-004
PASS: focused Vitest 1 file, 7 tests

eslint KanbanPage.tsx KanbanPage.test.tsx kanban.routes.tsx kanban-workspace-redesign.spec.js
PASS

playwright test e2e/kanban-workspace-redesign.spec.js --workers=1
PASS: 1 test
Artifacts: kanban-wide-three-columns.png, kanban-tablet-local-overflow.png

npm run build
PASS: TypeScript and Vite production bundle
NOTE: existing non-blocking SignalR/Rolldown PURE annotation warnings remain.

git diff --check -- <US-KANBAN-004 files>
PASS: line-ending warnings only
```

## Broader Regression Status

```text
npm run test:run
PARTIAL: 30/31 files and 120/122 tests passed.
UNRELATED: two existing Journal redesign tests fail because the current Journal
page does not render `journal-workspace` or the `Journal title` label.

npm run lint
PARTIAL: Kanban-focused lint passes.
UNRELATED: full lint has one restricted Trash feature import in
`features/notes/api/note.api.ts` and one `useMemo` dependency warning in
`features/trash/pages/TrashPage.tsx`.
```

No P1 or P2 finding remains in `US-KANBAN-004`. The broader failures are in
pre-existing dirty Journal, Notes, and Trash work and were not modified to make
this Kanban review pass.

## Proof State

| Layer | Value | Reason |
| --- | --- | --- |
| Unit | `1` | Focused Kanban component suite passed `7/7`. |
| Integration | `1` | Existing Kanban API/query/mutation contracts were reused; deterministic browser fixtures exercised list/detail/create-column envelopes. |
| E2E | `1` | Chromium wide-layout, real Add column UI, local overflow, panel, and unsupported-control checks passed. |
| Platform | `1` | Responsive Chromium proof and the production build passed. |
