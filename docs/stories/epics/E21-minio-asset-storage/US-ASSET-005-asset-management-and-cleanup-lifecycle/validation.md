# Validation

## Proof Strategy

Prove learners can manage saved avatar assets through the shared asset API and
that abandoned pending avatar uploads are removed automatically from both MinIO
and shared metadata.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | Owned asset list includes `isCurrentAvatar`, deleting current avatar clears profile state, deleting asset removes object best-effort, expired pending cleanup retires metadata. |
| Integration | API build, Hangfire recurring registration, shared avatar list/delete contract, and cleanup service wiring. |
| E2E | Focused Settings test for saved-avatar deletion and local cache clearing. |
| Platform | Frontend production build plus live MinIO/PostgreSQL smoke on Windows PowerShell. |
| Logs/Audit | Record existing warnings and cleanup-job runtime evidence. |

## Commands

```text
dotnet test src/backend/FluentA.Application.UnitTests/FluentA.Application.UnitTests.csproj --no-restore
dotnet build src/backend/FluentA.API/FluentA.API.csproj --no-restore -p:UseSharedCompilation=false
npm --prefix src/frontend run test:run -- SettingsPage
npm --prefix src/frontend run build
```

## Acceptance Evidence

- `dotnet test src/backend/FluentA.Application.UnitTests/FluentA.Application.UnitTests.csproj --no-restore`
  passed `103/103`, including new asset-service coverage for owned asset
  listing, current-avatar delete behavior, and expired pending cleanup.
- `dotnet build src/backend/FluentA.API/FluentA.API.csproj --no-restore -p:UseSharedCompilation=false`
  passed after wiring shared asset list/delete endpoints and recurring cleanup.
  The build emitted the existing `NU1903` warning for `Microsoft.OpenApi 2.0.0`
  only.
- `npm --prefix src/frontend run test:run -- SettingsPage`
  passed both focused Settings tests, including deletion of the current saved
  avatar and immediate cached profile clearing.
- `npm --prefix src/frontend run build`
  passed. Vite emitted the existing SignalR pure-annotation warning and the
  existing large-chunk warning only.
- Live API + MinIO + PostgreSQL smoke passed:
  - presigned current avatar upload returned direct `PUT 200`, finalize
    `status=finalized`, and profile save linked the avatar
  - a second finalized avatar appeared in `GET /api/v1/assets?assetType=avatar`,
    producing `2` saved assets with exactly one `isCurrentAvatar=true`
  - deleting the non-current avatar reduced the list to `1` and made the
    deleted public URL return `404`
  - deleting the current avatar reduced the list to `0`, made its public URL
    return `404`, and `/api/v1/settings` returned `profile.avatarUrl = null`
  - an uploaded but unfinalized avatar asset was manually expired in
    PostgreSQL, the cleanup runner deleted `1` asset, the public URL returned
    `404`, and PostgreSQL showed `Deleted|true`
