# US-ASSET-009 Validation

## Proof Strategy

Prove an owned Countdown can render its private cover without exposing it to a
foreign user or persisting a URL.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | ready/type/uploader/exclusivity checks; DTO expiry fields; delete detaches cover without deleting it |
| Integration | FK/exclusivity behavior; signed GET; foreign/deleted Countdown denial |
| Frontend | create with cover, render, reload/refetch, upload failure |
| E2E | two-user cover access and Countdown delete/detach |

## Fixtures

- Two users, ready and invalid cover assets, Countdown with/without cover.

## Commands

```text
dotnet test src/backend/FluentA.Application.UnitTests/FluentA.Application.UnitTests.csproj
npm --prefix src/frontend run test:run
npm --prefix src/frontend run build
```

## Validation Readiness

| Assumption | Risk | Evidence | Result |
| --- | --- | --- | --- |
| Countdown already has a feature FK | Missing durable ownership relation | `countdowns.cover_asset_id` is modeled in Domain/EF and current create validates an owned ready `countdown-cover` | READY |
| The feature can deliver private media | Generic asset read could bypass feature authorization | `IAssetObjectStorage.CreatePresignedDownload` exists; US-ASSET-008 uses it after owner-scoped feature lookup | READY |
| One cover cannot attach twice | A shared asset could be reused by multiple business records | Add an exclusive index plus application check in this story; current schema has no such constraint | READY WITH CONSTRAINTS |
| Delete can preserve the approved lifecycle | US-ASSET-009 design incorrectly implied an archive transition before lifecycle support exists | Clear `cover_asset_id` here; US-ASSET-010 archives detached ready assets and handles purge/retry | READY WITH CONSTRAINTS |
| Browser upload can meet the shared presign contract | Missing file metadata would fail presign | Shared client now sends name, content type, and size; Notes E2E proved the path against MinIO | READY |

## Acceptance Evidence

- Applied `20260716193216_AddCountdownCoverAssetOwnership` to local PostgreSQL;
  the partial unique index and restrictive FK are present.
- Backend unit suite: 116 passed, including Countdown cover type/ready owner
  validation, duplicate attachment rejection, signed DTO delivery, and
  delete-detach behavior.
- Frontend suite: 17 files and 64 tests passed. Frontend production build
  passed with existing SignalR pure-annotation warnings.
- Countdown E2E: 1 passed against local API, PostgreSQL, and MinIO. It uploads
  a real PNG through the file picker, renders a URL containing
  `X-Amz-Algorithm`, and proves a foreign user receives `404` on delete.
- API build passed with the existing `NU1903` Microsoft.OpenApi advisory.
