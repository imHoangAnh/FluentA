# Design

## Domain Model

No domain entities change. Existing scheduled job behavior remains in
Application and Infrastructure services.

## Application Flow

The Worker composes shared infrastructure, starts the Hangfire server, and
registers stable recurring jobs through `RecurringJobRegistration`. Hangfire
activates `IScheduledProductivityJobs` implementations from Infrastructure.

## Interface Contract

Worker endpoints:

- `GET /health/live` returns 200 when the Worker process is alive.
- `GET /health/ready` returns 200 only when PostgreSQL and Hangfire storage are
  reachable; otherwise it returns 503.

API routes remain unchanged. No Hangfire dashboard route is mapped.

## Data Model

No migrations are required. Hangfire continues using the application
PostgreSQL database and existing Hangfire storage tables.

## UI / Platform Impact

Local development supports:

```powershell
dotnet run --project src/backend/FluentA.Worker
docker compose -f docker-compose.dev.yml --profile worker up -d worker
```

The Worker health port is `5001`; API remains on `5000`.

## Observability

Worker startup uses normal ASP.NET Core and Hangfire logs. Existing job bodies
continue emitting structured job summaries.

## Alternatives Considered

1. Keep Hangfire inside API. Rejected because Feature 19 requires API and
   background-job runtime ownership to split.
2. Move job logic into Worker. Rejected because Application/Infrastructure
   already own job behavior and Worker should remain a composition root.
3. Add a broker. Rejected by the locked no-broker rule.
