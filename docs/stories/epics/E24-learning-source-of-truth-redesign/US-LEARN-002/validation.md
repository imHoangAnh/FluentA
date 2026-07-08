# Validation

## Proof Strategy

Prove that Review now owns a durable session lifecycle and queue membership
without relying on history-only reconstruction or flashcard deck/card joins.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | Review service/repository coverage for create, previous-day replace, same-day active detection, and item completion |
| Integration | EF migration plus owner-scoped session/item persistence and submit behavior |
| E2E | deferred unless backend changes force a route/response adaptation immediately |
| Platform | backend build and focused frontend type/build checks if DTOs change |
| Performance | not targeted in this slice |
| Logs/Audit | existing request logs only |

## Fixtures

- Authenticated learner with one board and multiple due words across two pages.
- Previous-day active session fixture.
- Same-day active session fixture.
- Foreign-owned board/session fixture.

## Commands

```text
dotnet test src/backend/FluentA.Domain.UnitTests/FluentA.Domain.UnitTests.csproj --filter "Review|Vocabulary|Srs"
dotnet test src/backend/FluentA.Application.UnitTests/FluentA.Application.UnitTests.csproj --filter "Review"
dotnet build src/backend/FluentA.API/FluentA.API.csproj --no-restore
dotnet tool run dotnet-ef migrations script --project src/backend/FluentA.Infrastructure --startup-project src/backend/FluentA.API
npm --prefix src/frontend run build
.\scripts\bin\harness-cli.exe query matrix
git diff --check
```

## Acceptance Evidence

- Pending implementation.
