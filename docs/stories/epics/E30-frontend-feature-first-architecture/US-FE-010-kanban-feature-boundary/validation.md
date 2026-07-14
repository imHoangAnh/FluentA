# Validation — US-FE-010

| Assumption | Evidence | Result |
| --- | --- | --- |
| Route can cut over unchanged. | Legacy manifest has one independent `kanban` entry. | READY |
| Realtime can move without behavior drift. | `useKanbanSync` invalidates `['kanban']` with `refetchType: 'all'`. | READY |
| Pomodoro can consume a public feature boundary. | It only lists Kanban boards and board cards. | READY |

## Implementation and review evidence

| Acceptance criterion | Evidence | Result |
| --- | --- | --- |
| `/kanban` retains its route and lazy loading. | `kanbanRoutes` is composed by `app/router.tsx`; the legacy manifest no longer owns `kanban`. | PASS |
| Kanban owns its UI, API/types, and realtime hook. | Board page, API/types, and `useKanbanSync` now live under `features/kanban`. | PASS |
| Cache/realtime behavior is preserved. | The moved hook still invalidates `['kanban']` with `refetchType: 'all'`; live two-tab E2E passed. | PASS |
| Pomodoro uses the public boundary. | Pomodoro imports `@/features/kanban`; old Kanban paths and cross-feature deep-import scans returned no matches. | PASS |

## Commands and results

- Focused app tests — PASS: 3 files, 13 tests.
- `npm --prefix src/frontend run test:run` — PASS: 18 files, 58 tests.
- `npm --prefix src/frontend run lint` — PASS.
- `npm --prefix src/frontend run build` — PASS with known third-party `@microsoft/signalr` pure-annotation warnings only.
- `npm --prefix src/frontend run test:e2e -- kanban-board.spec.js kanban-sync.spec.js` — PASS: board/card workflow and same-user two-tab realtime sync, 2 tests.
- Legacy Kanban path and cross-feature deep-import scans — PASS: no active matches.
- `git diff --check` — PASS.

## Review findings

No P1, P2, or P3 findings. The migration changes only frontend ownership and
imports; URLs, request payloads, query keys, realtime invalidation, backend
contracts, board/card behavior, and Pomodoro workflow remain unchanged.
