# Validation

## Proof Strategy

Prove Feature 18 is complete: the shipped avatar runtime no longer depends on
Cloudinary, the legacy profile field is gone from the runtime and local schema,
and the full MinIO avatar lifecycle still works end to end.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | Auth/profile and asset-service tests still pass after removing the old provider seam and legacy profile field. |
| Integration | API build, EF migration generation/application, and source-level proof that dead Cloudinary wiring is gone. |
| E2E | Focused Settings test remains green for saved-avatar behavior. |
| Platform | Frontend production build plus live MinIO/PostgreSQL release smoke on Windows PowerShell. |
| Logs/Audit | Record existing warnings and explicit schema-removal evidence. |

## Commands

```text
dotnet test src/backend/FluentA.Application.UnitTests/FluentA.Application.UnitTests.csproj --no-restore
dotnet build src/backend/FluentA.API/FluentA.API.csproj --no-restore -p:UseSharedCompilation=false
npm --prefix src/frontend run test:run -- SettingsPage
npm --prefix src/frontend run build
dotnet tool run dotnet-ef database update --project src/backend/FluentA.Infrastructure --startup-project src/backend/FluentA.API
```

## Acceptance Evidence

- `dotnet test src/backend/FluentA.Application.UnitTests/FluentA.Application.UnitTests.csproj --no-restore`
  passed `103/103` after removing the dead Cloudinary seam and updating the
  profile-domain contract.
- `dotnet build src/backend/FluentA.API/FluentA.API.csproj --no-restore -p:UseSharedCompilation=false`
  passed after removing the Cloudinary package and DI registration. The build
  emitted the existing `NU1903` warning for `Microsoft.OpenApi 2.0.0` only.
- `npm --prefix src/frontend run test:run -- SettingsPage`
  passed both focused Settings tests.
- `npm --prefix src/frontend run build`
  passed. Vite emitted the existing SignalR pure-annotation warning and the
  existing large-chunk warning only.
- `dotnet tool run dotnet-ef database update --project src/backend/FluentA.Infrastructure --startup-project src/backend/FluentA.API`
  applied migration `20260703162616_RemoveLegacyAvatarPublicId`.
- Source-level release cleanup proof passed:
  - no remaining `IAvatarStorage` or `CloudinaryAvatarStorage` runtime source
  - no `CloudinaryDotNet` package reference
  - `User` and `UserConfiguration` no longer carry `avatar_public_id`
- Live API + MinIO + PostgreSQL release smoke passed:
  - current avatar upload finalized and linked successfully
  - `GET /api/v1/assets?assetType=avatar` returned `2` assets with exactly one
    `isCurrentAvatar=true`
  - deleting the non-current avatar reduced the list to `1` and made the
    deleted public URL return `404`
  - deleting the current avatar reduced the list to `0`, made its public URL
    return `404`, and `/api/v1/settings` returned `profile.avatarUrl = null`
  - an uploaded but unfinalized avatar asset was manually expired, the cleanup
    runner deleted `1` asset, and PostgreSQL returned `Deleted|true`
  - `information_schema.columns` returned `false` for
    `auth_users.avatar_public_id`
