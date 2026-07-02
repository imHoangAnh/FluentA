# Validation

## Proof Strategy

Build the API and run the baseline collector to show connection settings and
connection-state visibility. Full exhaustion testing remains out of scope for
this slice.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | Not applicable. |
| Integration | API build verifies DI and Npgsql builder code. |
| E2E | Not applicable. |
| Platform | Local config binds without requiring new secrets. |
| Performance | Baseline report shows connection counts and `max_connections`. |
| Logs/Audit | Harness trace records explicit local budget. |

## Fixtures

- Development appsettings.
- Local Postgres container.

## Commands

```text
dotnet build src/backend/FluentA.API/FluentA.API.csproj --no-restore
.\scripts\database\collect-db-performance-baseline.ps1
```

## Acceptance Evidence

- `dotnet build src/backend/FluentA.API/FluentA.API.csproj --no-restore`
  passed with 0 warnings and 0 errors.
- `src/backend/FluentA.API/appsettings.Development.json` now documents local
  `Database:Postgres` pool and timeout defaults plus `Hangfire:WorkerCount`.
- `FluentA.Infrastructure.DependencyInjection` normalizes the Npgsql connection
  string with pooling enabled, `MaxPoolSize = 30`, connection timeout 15
  seconds, command timeout 30 seconds, and configurable application name.
- Baseline report captured Postgres `max_connections = 100` and current
  connection states.
