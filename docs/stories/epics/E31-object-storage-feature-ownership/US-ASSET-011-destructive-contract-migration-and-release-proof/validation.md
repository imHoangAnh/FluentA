# US-ASSET-011 Validation

## Proof Strategy

Rehearse the breaking release against seeded legacy state, then prove the final
application has no URL-at-rest/public-read path and all feature ownership,
archive, purge, and private-render flows remain coherent.

## Test Plan

| Layer | Cases |
| --- | --- |
| Migration | seeded old avatar/Note/cover rows and objects are reset; new constraints hold; Down cannot claim data recovery |
| Unit | full backend suites and status/authorization regressions |
| Integration | PostgreSQL + private MinIO upload/download/archive/purge and old-object queue drain |
| Frontend | Settings, Notes, Countdown focused suites plus build |
| E2E | two-user private media flows, reload/expiry behavior, delete/archive, anonymous denial |
| Contract | OpenAPI/source/DB scans contain no legacy URL fields or public policy |
| Platform | Docker config, migration apply, job registration, logs and queue observability |

## Fixtures

- Seeded pre-E31 database and MinIO objects for all three asset types.
- Fresh post-E31 users/assets plus transient provider failure.

## Commands

```text
dotnet test src/backend/FluentA.slnx
npm --prefix src/frontend run lint
npm --prefix src/frontend run test:run
npm --prefix src/frontend run build
npm --prefix src/frontend run test:e2e
dotnet tool run dotnet-ef database update --project src/backend/FluentA.Infrastructure --startup-project src/backend/FluentA.API
docker compose -f docker-compose.dev.yml config
git diff --check
```

## Acceptance Evidence

Pending implementation, destructive migration rehearsal, and release proof.
