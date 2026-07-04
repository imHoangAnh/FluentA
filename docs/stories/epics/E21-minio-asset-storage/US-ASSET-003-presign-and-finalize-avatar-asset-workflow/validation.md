# Validation

## Proof Strategy

Prove the shared asset API can create a pending owned avatar upload, accept a
direct MinIO PUT through a presigned URL, and finalize the uploaded object only
after server-side metadata verification.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | Presign validation, finalize validation, pending-expiry checks, owner scope, storage-unavailable behavior. |
| Integration | API build, migration/database up-to-date proof, and controller/service wiring for the new asset routes. |
| E2E | Deferred until the Settings/avatar UI switches to the new asset API. |
| Platform | Local Windows PowerShell + Docker MinIO runtime supports presign, PUT, and finalize. |
| Performance | No special performance target in this story beyond successful direct upload flow. |
| Logs/Audit | Validation records the presign/finalize runtime steps and any existing environment warnings. |

## Fixtures

- Local PostgreSQL, Redis, and MinIO runtime from `docker-compose.dev.yml`.
- Authenticated local test user created through the current auth API.
- Small deterministic PNG probe for direct upload.

## Commands

```text
dotnet test src/backend/FluentA.Application.UnitTests/FluentA.Application.UnitTests.csproj --no-restore
dotnet build src/backend/FluentA.API/FluentA.API.csproj --no-restore
dotnet tool run dotnet-ef database update --project src/backend/FluentA.Infrastructure --startup-project src/backend/FluentA.API
```

## Acceptance Evidence

- `dotnet test src/backend/FluentA.Application.UnitTests/FluentA.Application.UnitTests.csproj --no-restore`
  passed 97 tests, including new shared-asset presign/finalize coverage.
- `dotnet build src/backend/FluentA.API/FluentA.API.csproj --no-restore -p:UseSharedCompilation=false`
  passed after adding the shared asset service, controller, and a presigned-URL
  protocol fix in `MinioAssetObjectStorage`. The build emitted the existing
  `NU1903` warning for `Microsoft.OpenApi 2.0.0`.
- `dotnet tool run dotnet-ef database update --no-build --project src/backend/FluentA.Infrastructure --startup-project src/backend/FluentA.API`
  applied `20260703121520_AddAssetMetadataFoundation` to the local PostgreSQL
  runtime.
- Live API + MinIO smoke passed:
  - authenticated `POST /api/v1/assets/presign` returned a pending asset and a
    direct HTTP upload URL
  - `POST /api/v1/assets/finalize` before upload returned `422
    ASSET_UPLOAD_INVALID`
  - direct PUT of a 68-byte PNG to MinIO succeeded
  - authenticated finalize then returned `status=finalized`,
    `contentType=image/png`, and `sizeBytes=68`
  - the public asset URL returned HTTP `200`
  - PostgreSQL `assets` row inspection showed `Finalized|image/png|68`, and
    `auth_users.current_avatar_asset_id` remained empty as expected in this
    story
