# Design

## Domain Model

Reuse the shared owned `Asset` aggregate from `US-ASSET-002`.

- Asset list returns non-deleted owned `avatar` rows and annotates whether each
  row matches `auth_users.current_avatar_asset_id`.
- Asset delete is owner-scoped and soft-deletes the selected asset metadata.
- Deleting the current avatar asset also clears `current_avatar_asset_id` and
  `avatar_url` on the Auth-owned user profile.
- Cleanup targets both already-`Expired` assets and `Pending` assets whose
  `expires_at` has passed.

## Application Flow

Backend:

1. `GET /api/v1/assets?assetType=avatar` loads owned non-deleted avatar rows,
   newest first, and maps them to DTOs with `isCurrentAvatar`.
2. `DELETE /api/v1/assets/{assetId}` loads the owned asset and current user.
3. If the deleted asset is the current avatar, the durable write clears profile
   avatar state and marks the asset deleted together.
4. Object deletion runs as best-effort cleanup after the durable user/asset
   state is updated.
5. `CleanupExpiredPendingAsync` runs from Hangfire, removes expired pending
   objects from MinIO best-effort, marks pending rows expired when needed, then
   soft-deletes the metadata.

Frontend:

1. Settings loads saved avatar assets through the shared asset API.
2. Each saved avatar shows thumbnail, status, size, and a delete action.
3. Deleting a non-current avatar removes only that saved asset.
4. Deleting the current avatar also clears the cached profile avatar state so
   Settings and auth identity surfaces update immediately.

## Interface Contract

- The first list/delete API still supports only `assetType=avatar`.
- Delete keeps owner-scoped non-disclosure semantics through
  `404 ASSET_NOT_FOUND`.
- The cleanup job is internal recurring behavior, not a public API surface.

## Runtime Impact

Hangfire registers a recurring `pending-asset-cleanup` job on the Worker
process schedule, running hourly at minute 15.

## Alternatives Considered

1. Keep asset deletion inside `PUT /api/v1/profile` only.
   Rejected because Feature 18 locked decisions require shared asset list/delete
   capabilities beyond the profile-save contract.
2. Leave expired pending rows in PostgreSQL and rely on MinIO lifecycle rules
   later.
   Rejected because locked decisions D14-D15 require application-owned cleanup
   of abandoned pending uploads now.
