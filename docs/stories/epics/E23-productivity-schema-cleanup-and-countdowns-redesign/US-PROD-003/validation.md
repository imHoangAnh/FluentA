# Validation

## Proof Strategy

Run the Feature 22 release ladder and pair it with static cleanup evidence so
we can prove both behavior and residue removal.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | none beyond upstream story coverage unless a regression appears |
| Integration | migration/script review, direct DB inspection for removed/renamed objects, notification/cleanup state checks |
| E2E | focused productivity flow coverage across Todo, Kanban, Journal, and Countdown |
| Platform | matrix query, stale-identifier scans, `git diff --check` |
| Performance | not required for this story |
| Logs/Audit | background-job and request-log review where cleanup/alerts were exercised |

## Fixtures

- Post-migration local database with representative Todo, Kanban, Journal, and
  Countdown data.
- One finalized countdown cover asset and one retired countdown to verify
  cleanup.

## Commands

```text
dotnet test src/backend/FluentA.Domain.UnitTests/FluentA.Domain.UnitTests.csproj --filter "Todo|Kanban|Journal|Countdown|Asset"
dotnet test src/backend/FluentA.Application.UnitTests/FluentA.Application.UnitTests.csproj --filter "Todo|Kanban|Journal|Countdown|Asset"
dotnet build src/backend/FluentA.API/FluentA.API.csproj --no-restore
dotnet tool run dotnet-ef migrations script --project src/backend/FluentA.Infrastructure --startup-project src/backend/FluentA.API
npm --prefix src/frontend run lint
npm --prefix src/frontend run test:run -- Todo Kanban Journal Countdown
npm --prefix src/frontend run build
npm --prefix src/frontend run test:e2e -- productivity.spec.js
.\scripts\bin\harness-cli.exe query matrix
git diff --check
```

## Acceptance Evidence

Pending implementation.
