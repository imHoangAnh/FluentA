# Validation

## Proof Strategy

The story is done when backend unit tests prove validation/domain behavior,
database migration applies, frontend tests/build pass, and a focused browser
scenario proves the authenticated Kanban workflow end to end.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | Board default columns, request validation, owner-scoped not found, blocked non-empty column deletion, card move to owned column. |
| Integration | EF migration applies to PostgreSQL and indexes/tables exist. |
| E2E | Create board, default columns, add column, create/edit/move/delete card, filters, blocked column delete, owner isolation. |
| Platform | Desktop browser route from protected navigation; horizontally scrollable board layout. |
| Performance | No formal benchmark; board detail loads all active cards once for client filters. |
| Logs/Audit | Existing API request logging only. |

## Fixtures

- Authenticated primary user.
- Secondary user for owner-isolation API proof.
- One board with default columns, one extra column, several cards with priority,
  deadline, and tags.

## Commands

```text
dotnet test src/backend/FluentA.slnx
dotnet build src/backend/FluentA.slnx
dotnet ef database update --project src/backend/FluentA.Infrastructure --startup-project src/backend/FluentA.API
npm --prefix src/frontend run lint
npm --prefix src/frontend run test:run
npm --prefix src/frontend run build
npx playwright test e2e/kanban-board.spec.js --workers=1
```

## Acceptance Evidence

- `dotnet test src/backend/FluentA.slnx` passed: 40 Domain tests and 68
  Application tests.
- `dotnet build src/backend/FluentA.slnx` passed with 0 warnings and 0 errors.
- `dotnet ef database update --project src/backend/FluentA.Infrastructure
  --startup-project src/backend/FluentA.API` applied
  `20260611180514_AddKanbanBoardFoundation`; rerun confirmed database up to
  date.
- `npm --prefix src/frontend run lint` passed.
- `npm --prefix src/frontend run test:run` passed: 29 Vitest tests.
- `npm --prefix src/frontend run build` passed with the known third-party
  SignalR/Rolldown annotation warning.
- `npx playwright test e2e/kanban-board.spec.js --workers=1` passed and proved
  board creation/default columns, column add/delete blocking, card create/edit,
  move, filters, owner isolation, card delete, empty column delete, and desktop
  visual rendering.
