# Design

## Domain Model

Reuse the shared owned `Asset` aggregate from `US-ASSET-002` and the
presign/finalize API from `US-ASSET-003`.

The profile remains Auth-owned:

- `auth_users.current_avatar_asset_id` points at the current owned finalized
  avatar asset.
- `auth_users.avatar_url` remains the public URL surfaced to existing client
  DTOs.
- Replaced or removed owned avatar assets are soft-deleted after the durable
  profile update succeeds.

## Application Flow

Backend:

1. `PUT /api/v1/profile` now accepts `{ fullName, bio, removeAvatar,
   avatarAssetId }`.
2. When `avatarAssetId` is present, Auth loads the owned asset and requires
   `assetType=avatar` plus `status=finalized`.
3. The durable profile update writes the new `avatar_url`,
   `current_avatar_asset_id`, and retired-asset soft deletion together.
4. Old MinIO object cleanup runs as best-effort after the durable write
   succeeds.

Frontend:

1. Choosing a file updates only local draft/preview state.
2. Save profile validates name, bio, and file rules locally.
3. If a new file still needs upload, the page calls:
   - `POST /api/v1/assets/presign`
   - direct browser `PUT` to MinIO
   - `POST /api/v1/assets/finalize`
4. The resulting `avatarAssetId` is cached in draft state so a profile-save
   retry can reuse it without re-uploading.
5. The page then calls `PUT /api/v1/profile`.

## Interface Contract

- `PUT /api/v1/profile` is now JSON, not multipart.
- `PUT /api/v1/profile` returns `404 ASSET_NOT_FOUND` for missing or foreign
  avatar assets.
- `PUT /api/v1/profile` returns `409 AVATAR_ASSET_INVALID` for non-finalized or
  wrong-type avatar assets.

## Runtime Impact

Local MinIO bootstrap now applies bucket CORS so browser direct `PUT` from the
local SPA can succeed.

## Alternatives Considered

1. Finalize immediately on file selection.
   Rejected because it breaks explicit-save semantics and creates avoidable
   finalized-orphan assets.
2. Keep multipart profile upload and treat the shared asset API as optional.
   Rejected because Feature 18 requires the shared MinIO flow to become the
   real shipped avatar path.
