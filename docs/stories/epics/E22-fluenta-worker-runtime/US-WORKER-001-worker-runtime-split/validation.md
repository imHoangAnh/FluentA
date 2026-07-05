# Validation

## Proof Strategy

Prove the runtime ownership split at code, build, live process, and Harness
levels. Existing job service behavior remains covered by backend tests; live
Worker proof must show all stable recurring schedules are registered from the
Worker process.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | Backend solution tests for unchanged job/service behavior. |
| Integration | Worker/API builds; Worker recurring registration against Hangfire PostgreSQL storage. |
| E2E | Not required; no browser-visible behavior changes. |
| Platform | Docker Compose config with Worker profile and health port; live Worker health endpoints; API independent startup. |
| Performance | Connection budget docs updated for separate API and Worker pools. |
| Logs/Audit | Existing job logs remain in Infrastructure job bodies. |

## Fixtures

Local PostgreSQL, Redis, and MinIO from `docker-compose.dev.yml`; existing
development database migrations.

## Commands

```text
docker compose -f docker-compose.dev.yml config
dotnet build src/backend/FluentA.Worker/FluentA.Worker.csproj
dotnet build src/backend/FluentA.API/FluentA.API.csproj --no-restore
dotnet test src/backend/FluentA.slnx
dotnet run --project src/backend/FluentA.Worker
dotnet run --project src/backend/FluentA.API --launch-profile http
.\scripts\bin\harness-cli.exe story verify US-WORKER-001
.\scripts\bin\harness-cli.exe query matrix
git diff --check
```

## Acceptance Evidence

- `docker compose -f docker-compose.dev.yml --profile worker config`: passed and
  showed the `worker` profile service on port `5001` with `/health/ready`
  healthcheck wiring.
- `dotnet tool run dotnet-ef database update --project src/backend/FluentA.Infrastructure --startup-project src/backend/FluentA.API`:
  passed; database was already up to date.
- `dotnet build src/backend/FluentA.Worker/FluentA.Worker.csproj --no-restore`:
  passed with 0 warnings/errors.
- `dotnet build src/backend/FluentA.API/FluentA.API.csproj --no-restore`:
  passed with the existing `Microsoft.OpenApi` NU1903 warning.
- `dotnet test src/backend/FluentA.Application.UnitTests/FluentA.Application.UnitTests.csproj --filter RecurringJobRegistrationTests`:
  passed 1/1 and proves the five stable recurring IDs, target methods, and
  cron expressions.
- `dotnet test src/backend/FluentA.slnx`: passed 49 Domain and 104 Application
  tests with the existing `Microsoft.OpenApi` NU1903 warning.
- Live Worker smoke:
  - `/health/live` returned 200.
  - `/health/ready` returned 200 with PostgreSQL/Hangfire storage reachable.
  - Hangfire logs showed recurring registration and server startup from
    `FluentA.Worker` with worker count 5.
  - PostgreSQL `hangfire.hash` contained all five cron rows:
    `todo-carry-over`, `habit-reminders`, `countdown-alerts`,
    `pending-asset-cleanup`, and `database-cleanup`.
- Negative readiness smoke:
  - Worker started with an intentionally bad PostgreSQL port.
  - `/health/live` returned 200.
  - `/health/ready` returned 503.
  - Worker logged retrying Hangfire startup instead of crashing.
- API independence smoke:
  - API started on `http://localhost:5000` while Worker port `5001` was not
    listening.
  - `GET /openapi/v1.json` returned 200.
  - `GET /hangfire` returned 404.
- `git diff --check`: passed with line-ending warnings only.

Note: During the first live Worker proof, the existing local Hangfire schedule
was due and `TodoCarryOverJob` carried over 90 local development tasks to
2026-07-04. This affected only the local development database used for smoke
proof.
