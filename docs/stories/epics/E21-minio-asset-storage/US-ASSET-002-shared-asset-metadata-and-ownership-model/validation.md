# Validation

## Proof Strategy

Prove that FluentA can persist user-owned shared asset metadata, represent
controlled avatar lifecycle state, and link a user to a current avatar asset
without breaking the still-live Cloudinary-backed profile flow before later
Feature 18 stories replace it.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | Asset domain creation and lifecycle invariants; user current-avatar linkage invariants if new domain helpers are added. |
| Integration | EF model compiles or fails only because of unrelated dirty-worktree errors; migration or equivalent schema proof captures the asset table and `auth_users.current_avatar_asset_id` link. |
| E2E | Not applicable yet. |
| Platform | Windows PowerShell repo-root EF workflow remains the expected path. |
| Performance | Not applicable in this schema-foundation story. |
| Logs/Audit | Validation records whether any proof was constrained by unrelated repo build blockers. |

## Fixtures

- Existing `auth_users` rows from current development data.
- No Cloudinary-avatar backfill; existing avatars may remain unlinked.
- Controlled asset-type fixture `avatar`.

## Commands

```text
dotnet build src/backend/FluentA.Domain/FluentA.Domain.csproj --no-restore
dotnet build src/backend/FluentA.Infrastructure/FluentA.Infrastructure.csproj --no-restore
dotnet tool run dotnet-ef migrations add AddAssetMetadataFoundation --project src/backend/FluentA.Infrastructure --startup-project src/backend/FluentA.API
```

## Acceptance Evidence

- `dotnet test src/backend/FluentA.Domain.UnitTests/FluentA.Domain.UnitTests.csproj --no-restore`
  passed all 49 domain tests, including new shared-asset lifecycle and
  current-avatar-link coverage.
- `dotnet build src/backend/FluentA.API/FluentA.API.csproj --no-restore`
  passed after adding the shared asset aggregate, repository seam, EF
  configuration, and user current-avatar linkage. The build emitted the
  existing `NU1903` warning for `Microsoft.OpenApi 2.0.0`.
- `dotnet tool run dotnet-ef migrations add AddAssetMetadataFoundation
  --project src/backend/FluentA.Infrastructure --startup-project
  src/backend/FluentA.API` succeeded and generated migration
  `20260703121520_AddAssetMetadataFoundation`.
- The generated migration adds the `assets` table with owner/type/status/object
  metadata fields, plus nullable `auth_users.current_avatar_asset_id` with
  `SetNull` delete behavior and a unique index on `assets.object_key`.
