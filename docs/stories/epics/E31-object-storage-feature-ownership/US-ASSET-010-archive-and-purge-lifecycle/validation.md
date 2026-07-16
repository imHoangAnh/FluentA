# US-ASSET-010 Validation

## Proof Strategy

Prove immediate access revocation, 30-day retention, idempotent purge, and
retryable provider failure across Avatar, Notes, and Countdown.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | valid/invalid transitions, exact retention cutoff, READY-only downloads |
| Integration | atomic feature detach/archive; concurrent claim winner; failed delete remains retryable |
| Platform | hourly Hangfire registration; real MinIO delete and retry simulation |
| Logs | bounded structured counts without URLs/secrets |

## Fixtures

- Ready, archived-not-due, archived-due, pending-deletion, and deleted assets.
- Storage adapter that succeeds, returns not-found, or throws transient failure.

## Commands

```text
dotnet test src/backend/FluentA.Domain.UnitTests/FluentA.Domain.UnitTests.csproj
dotnet test src/backend/FluentA.Application.UnitTests/FluentA.Application.UnitTests.csproj
dotnet build src/backend/FluentA.API/FluentA.API.csproj
```

## Acceptance Evidence

Pending implementation and runtime proof.

