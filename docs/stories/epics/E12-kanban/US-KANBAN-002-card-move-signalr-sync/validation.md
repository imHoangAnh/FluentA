# Validation

## Proof Strategy

The story is done when backend tests prove notifier timing and authorization
boundaries, frontend checks pass, and a browser proof shows a second tab
refetching after `KanbanCardMoved`.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | Successful owned move publishes one event with board/card/from/to/sortOrder; foreign target move does not publish. |
| Integration | Existing authenticated `/hubs/sync` group is reused; no schema migration. |
| E2E | Two tabs logged in as the same user; moving a card in one tab updates the other tab's Kanban board. |
| Platform | Frontend lint, tests, and production build pass with known SignalR/Rolldown warning only. |
| Performance | No formal benchmark; event triggers query invalidation rather than full payload transfer. |
| Logs/Audit | Existing request logging only. |

## Fixtures

- Authenticated primary user with one Kanban board and a card in `To Do`.
- A second tab logged in as the same user and showing `/kanban`.
- Foreign board/column for rejected move proof in unit tests.

## Commands

```text
dotnet test src/backend/FluentA.slnx
dotnet build src/backend/FluentA.slnx
npm --prefix src/frontend run lint
npm --prefix src/frontend run test:run
npm --prefix src/frontend run build
npx playwright test e2e/kanban-sync.spec.js --workers=1
```

## Acceptance Evidence

- `dotnet test src/backend/FluentA.slnx` passed on 2026-06-12:
  40 Domain tests and 69 Application tests.
- `dotnet build src/backend/FluentA.slnx` passed on 2026-06-12:
  API project built with 0 warnings and 0 errors.
- `npm --prefix src/frontend run lint` passed on 2026-06-12 after E2E edits.
- `npm --prefix src/frontend run test:run` passed on 2026-06-12:
  3 files and 29 tests.
- `npm --prefix src/frontend run build` passed on 2026-06-12.
  Rolldown emitted the existing SignalR `/*#__PURE__*/` annotation warnings from
  `node_modules/@microsoft/signalr`, but the build completed successfully.
- `npx playwright test e2e/kanban-sync.spec.js --workers=1` passed on 2026-06-12:
  two authenticated tabs shared one Kanban board; after the first tab moved
  `Move me live` from `To Do` to `In Progress`, the second tab observed the
  `KanbanCardMoved`-driven refetch and rendered the card in `In Progress`.
