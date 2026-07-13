# Assets

## Product Boundary

Assets are user-owned uploaded files managed through a shared authenticated API.
Feature 18 introduced the first asset type, `avatar`, backed by MinIO in local
development. Feature 22 adds `countdown-cover` and the shipped Note Workspace
adds `note-image` as shared image asset types.

## User Outcomes

- An authenticated user can request a presigned upload target for an avatar.
- The browser uploads the avatar directly to MinIO without receiving storage
  credentials.
- The authenticated user finalizes the uploaded avatar asset only after the
  backend verifies MinIO object metadata.
- The authenticated user can finalize one optional countdown cover asset during
  countdown create after the backend verifies MinIO object metadata.
- Finalized avatar assets expose a public URL that the frontend can render
  immediately after the authenticated profile save links the asset as the
  current avatar.
- The authenticated user can list saved owned avatar assets and delete any of
  them from Settings.

## Ownership And Lifecycle Rules

- Assets are owned by the authenticated user only.
- Supported `assetType` values are `avatar`, `countdown-cover`, and
  `note-image`.
- Presign creates a pending asset record with a 1-hour expiry.
- Finalize requires the owned asset to still be pending and unexpired.
- Finalize verifies the MinIO object exists at the pending key, has an allowed
  image content type for the selected asset type, and is at most 2MB.
- `PUT /api/v1/profile` can link an owned finalized avatar asset as the
  current profile avatar.
- `POST /api/v1/countdowns` can link one owned finalized `countdown-cover`
  asset as the countdown cover during create only.
- `GET /api/v1/assets?assetType=avatar` returns the authenticated user's
  non-deleted owned avatar assets, newest first, and flags which one is the
  current profile avatar.
- `DELETE /api/v1/assets/{assetId}` soft-deletes the owned asset metadata and
  performs best-effort object deletion.
- Deleting the current avatar asset also clears the profile's
  `current_avatar_asset_id` and `avatar_url`.
- Replacing or removing the current avatar soft-deletes the retired owned
  avatar asset metadata after the durable profile update succeeds.
- Pending avatar uploads that are never finalized expire after 1 hour and are
  cleaned automatically by a recurring cleanup job.
- Countdown cover assets retire when the owning countdown is manually deleted
  or auto-retired after the seven-day completed window.

## Persistence Rules

- Shared asset metadata is stored in PostgreSQL `assets`.
- Each row stores `user_id`, `asset_type`, `status`, `object_key`,
  `public_url`, `content_type`, `size_bytes`, and optional `expires_at`.
- `auth_users.current_avatar_asset_id` points at the owned finalized avatar
  asset currently displayed by the profile.
- The shipped runtime no longer stores any provider-specific avatar identifier
  on `auth_users`.
- When a new finalized avatar replaces the current one, the retired asset row
  is soft-deleted and the user record points at the replacement asset.
- Cleanup treats expired pending avatar rows as soft-deleted metadata after
  best-effort MinIO object deletion.

## API Contract

All responses use the FluentA envelope.

### Endpoints In Scope

| Method | Endpoint | Behavior |
| --- | --- | --- |
| `POST` | `/api/v1/assets/presign` | Creates a pending owned avatar asset and returns a presigned direct-upload target. |
| `POST` | `/api/v1/assets/finalize` | Verifies the uploaded MinIO object for an owned pending avatar asset and marks it finalized. |
| `GET` | `/api/v1/assets?assetType=avatar` | Lists the authenticated user's saved owned avatar assets and marks the current profile avatar. |
| `DELETE` | `/api/v1/assets/{assetId}` | Deletes an owned avatar asset, clearing the current profile avatar if that asset was active. |
| `PUT` | `/api/v1/profile` | Links or removes the current owned finalized avatar asset after explicit Settings-page save. |

## Validation And Error Rules

- Presign requires `assetType=avatar` or `assetType=countdown-cover`.
- Presign requires image content type `image/jpeg`, `image/png`, or
  `image/webp`.
- Finalize returns `404 ASSET_NOT_FOUND` when the asset is not owned by the
  authenticated user or does not exist.
- Finalize returns `409 ASSET_UPLOAD_EXPIRED` when the pending upload window
  has expired.
- Finalize returns `422 ASSET_UPLOAD_INVALID` when the MinIO object is missing,
  has the wrong content type, is empty, or exceeds 2MB.
- Delete returns `404 ASSET_NOT_FOUND` when the selected asset does not exist
  or is not owned by the authenticated user.
- `PUT /api/v1/profile` returns `404 ASSET_NOT_FOUND` when the selected avatar
  asset is not owned by the authenticated user or does not exist.
- `PUT /api/v1/profile` returns `409 AVATAR_ASSET_INVALID` when the selected
  asset is not a finalized `avatar` upload.
- Presign or finalize return `503 ASSET_STORAGE_UNAVAILABLE` when asset storage
  is disabled or unreachable at the application boundary.

## Acceptance Criteria

- An authenticated user can presign an avatar upload without receiving MinIO
  secrets.
- The presigned URL accepts a direct browser PUT with the requested content
  type.
- Finalize fails when no object exists at the pending key.
- Finalize succeeds after upload and returns finalized asset metadata with the
  public URL and durable size/content-type values.
- The finalized asset row is durable in PostgreSQL, remains owned by the
  authenticated user, and can become the current profile avatar through
  explicit Settings-page save.
- The authenticated user can list saved avatar assets, delete a non-current
  avatar asset without affecting the profile, and delete the current avatar
  asset while the profile clears back to no avatar.
- Replacing or removing the current avatar retires the old owned avatar asset
  metadata and leaves the profile on the new durable avatar URL or no avatar.
- An abandoned pending avatar upload is eventually removed from both MinIO and
  PostgreSQL metadata by the scheduled cleanup job.
