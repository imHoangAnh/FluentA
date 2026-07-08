# Validation

## Proof Strategy

Prove that Todo, Kanban, and Journal no longer depend on retired fields or old
contracts, and that the narrower UX still supports the approved core flows.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | Todo ordering without carry-over; Kanban no-tag validation; Journal title/date/content rules |
| Integration | EF migration/script review for removed columns and renames; owner-scoped CRUD after route/DTO cutover |
| E2E | Todo day/week create/complete/delete, Kanban board/card CRUD with priority/deadline filters, Journal create/autosave/calendar/title search |
| Platform | `git diff --check`; static scans for removed identifiers and route names |
| Performance | not required for this story |
| Logs/Audit | request logs and migration output reviewed for unexpected errors |

## Fixtures

- One authenticated learner with Todo tasks across past/today/week dates.
- One owned Kanban board with multiple columns/cards using deadlines and varied
  priorities.
- One owned Journal set with titles, optional content, and multiple `date`
  values for calendar proof.

## Commands

```text
dotnet test src/backend/FluentA.Domain.UnitTests/FluentA.Domain.UnitTests.csproj --filter "Todo|Kanban|Journal"
dotnet test src/backend/FluentA.Application.UnitTests/FluentA.Application.UnitTests.csproj --filter "Todo|Kanban|Journal"
dotnet build src/backend/FluentA.API/FluentA.API.csproj --no-restore
dotnet tool run dotnet-ef migrations script --project src/backend/FluentA.Infrastructure --startup-project src/backend/FluentA.API
npm --prefix src/frontend run lint
npm --prefix src/frontend run test:run -- Todo Kanban Journal
npm --prefix src/frontend run build
```

## Acceptance Evidence

Pending implementation.
