# US-DEPLOY-001 Validation

## Proof Strategy

Prove the runtime contract independently from Docker and AWS first. The story
is complete only when Production configuration fails closed, Development
remains usable, authentication survives an API restart with the same configured
key, exact CORS/cookie rules hold, and readiness responds correctly for both
healthy and unavailable dependencies.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | production options; signing-key parse/validation; cookie settings; origin validation |
| Integration | login/refresh across two API hosts using the same key; PostgreSQL/Redis/MinIO readiness |
| E2E | local HTTPS-proxy auth refresh and SignalR negotiation using the configured frontend origin |
| Platform | live 200; ready 200 when healthy; ready 503 for each unavailable required dependency |
| Performance | readiness completes within an explicit short timeout and does not exhaust connection pools |
| Logs/Audit | startup/readiness logs are actionable and contain no secrets, connection strings, tokens, or key material |

## Fixtures

- deterministic local PostgreSQL, Redis, and private MinIO containers;
- a non-production RSA key created only for tests;
- allowed and rejected frontend origins;
- a registered verified test user;
- dependency-unavailable configurations for each readiness check.

## Planned Commands

Commands are finalized during validation. Expected proof includes:

```powershell
dotnet test src/backend/FluentA.slnx --configuration Release
dotnet build src/backend/FluentA.slnx --configuration Release
docker compose -f docker-compose.dev.yml config --quiet
```

Add focused API integration and local proxy smoke commands after their test
harness exists. Do not claim EC2, DNS, Vercel, migration, backup, or rollback
proof in this story.

## Acceptance Evidence

Pending validation and implementation.

