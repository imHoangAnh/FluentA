# US-ASSET-009 Validation

## Proof Strategy

Prove an owned Countdown can render its private cover without exposing it to a
foreign user or persisting a URL.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | ready/type/uploader/exclusivity checks; DTO expiry fields; detach/archive |
| Integration | FK and transaction behavior; private GET; foreign/deleted Countdown denial |
| Frontend | create with cover, render, reload/refetch, upload failure |
| E2E | two-user cover access and Countdown delete/archive |

## Fixtures

- Two users, ready and invalid cover assets, Countdown with/without cover.

## Commands

```text
dotnet test src/backend/FluentA.Application.UnitTests/FluentA.Application.UnitTests.csproj
npm --prefix src/frontend run test:run
npm --prefix src/frontend run build
```

## Acceptance Evidence

Pending implementation and runtime proof.

