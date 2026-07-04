# Validation

## Proof Strategy

Prove the shipped Settings/avatar flow now uses finalized owned MinIO assets as
the real profile avatar path, including retry behavior, replacement cleanup,
and remove-avatar behavior.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | Finalized asset links to profile, replacing current avatar retires the old asset, removing current avatar clears the link, invalid/pending asset selection is rejected. |
| Integration | API build, JSON `PUT /api/v1/profile` contract, and MinIO CORS bootstrap wiring. |
| E2E | Focused component-level Settings proof for upload-on-save and retry reuse. |
| Platform | Frontend production build plus live MinIO/profile smoke on Windows PowerShell. |
| Logs/Audit | Record any existing warnings and the concrete replacement/remove runtime evidence. |

## Commands

```text
dotnet test src/backend/FluentA.Application.UnitTests/FluentA.Application.UnitTests.csproj --no-restore
dotnet build src/backend/FluentA.API/FluentA.API.csproj --no-restore -p:UseSharedCompilation=false
npm --prefix src/frontend run test:run -- SettingsPage
npm --prefix src/frontend run build
```

## Acceptance Evidence

- `dotnet test src/backend/FluentA.Application.UnitTests/FluentA.Application.UnitTests.csproj --no-restore`
  passed `100/100`, including new AuthService coverage for finalized-asset
  linking, replacement cleanup, remove-avatar cleanup, and invalid pending
  asset rejection.
- `dotnet build src/backend/FluentA.API/FluentA.API.csproj --no-restore -p:UseSharedCompilation=false`
  passed after switching `PUT /api/v1/profile` to the finalized-asset JSON
  contract. The build emitted the existing `NU1903` warning for
  `Microsoft.OpenApi 2.0.0` and one transient `MSB3026` retry while
  `FluentA.Domain.dll` was in use by the running local API.
- `npm --prefix src/frontend run test:run -- SettingsPage`
  passed the focused Settings test proving upload-on-save behavior and retry
  reuse of an already finalized `avatarAssetId`.
- `npm --prefix src/frontend run build`
  passed. Vite emitted the existing SignalR pure-annotation warning and the
  existing large-chunk warning only.
- Live API + MinIO + PostgreSQL smoke passed:
  - MinIO browser-style preflight against the presigned upload URL returned
    `204` and `Access-Control-Allow-Origin: http://127.0.0.1:5173`
  - first presigned avatar upload returned direct `PUT 200` and finalize
    `status=finalized`
  - `PUT /api/v1/profile` linked that finalized asset as the current avatar and
    returned its MinIO public URL
  - second presigned avatar upload also returned `PUT 200` and finalize
    `status=finalized`
  - replacing the avatar updated the profile to the second public URL, made the
    first public URL return `404`, and PostgreSQL showed the first asset row as
    `Deleted` while `auth_users.current_avatar_asset_id` pointed at the second
    asset
  - removing the current avatar returned `avatarUrl=null`, made the second
    public URL return `404`, and PostgreSQL showed both asset rows as
    `Deleted` with `auth_users.current_avatar_asset_id` and `avatar_url`
    cleared to `null`
