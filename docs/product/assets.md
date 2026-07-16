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
- The authenticated user can upload a Note image which becomes usable only
  when an owned Note page attaches it through the Note feature.
- Ready avatar assets are rendered through a short-lived signed download URL
  after the authenticated profile save links the asset as the current avatar.
- The authenticated user can list saved owned avatar assets and delete any of
  them from Settings.

## Ownership And Lifecycle Rules

- Assets are owned by the authenticated user only.
- Supported `assetType` values are `avatar`, `countdown-cover`, and
  `note-image`.
- Presign creates a `pending-upload` asset record with a 1-hour expiry and
  records the server-selected bucket plus sanitized original file name.
- Finalize requires the owned asset to still be pending and unexpired.
- Finalize verifies the MinIO object exists at the pending key, has an allowed
  image content type for the selected asset type, and is at most 2MB.
- `PUT /api/v1/profile` can link an owned ready avatar asset as the
  current profile avatar.
- `POST /api/v1/countdowns` can link one owned ready `countdown-cover` asset
  as the countdown cover during create only; an active cover asset cannot be
  attached to another active Countdown.
- Authorized Countdown reads return a five-minute `coverDownloadUrl` and its
  expiry rather than the asset's stored public URL.
- A Note page may link many ready owned `note-image` assets through
  `note_page_assets`; each image asset may belong to one active Note page only.
- Note page persistence contains the durable asset id but never a provider or
  signed image URL. An authorized Note-page read hydrates a five-minute signed
  URL in memory for rendering.
- `GET /api/v1/assets?assetType=avatar` returns the authenticated user's
  non-deleted owned avatar assets, newest first, flags the current profile
  avatar, and includes an authorized short-lived `downloadUrl` only for ready
  avatar assets.
- `DELETE /api/v1/assets/{assetId}` archives the owned ready avatar asset for
  30 days; it never performs the object delete on the request path.
- Deleting the current avatar asset clears the profile's current asset link and
  archives the retired asset for 30 days.
- Replacing or removing the current avatar archives the retired owned asset
  metadata after the durable profile update succeeds.
- Pending avatar uploads that are never finalized expire after 1 hour and are
  cleaned automatically by a recurring cleanup job.
- Deleting a Countdown clears its cover FK and archives its detached ready
  cover asset in the same durable write.
- Removing a Note image, deleting its page/board, or deleting a Countdown
  detaches its feature relationship and archives its ready asset immediately.
- Archived assets cannot receive a download URL, retain their object for 30
  days, then an hourly job claims and purges them asynchronously. Storage
  failures return the claim to `ARCHIVED` for retry.

## Persistence Rules

- Shared asset metadata is stored in PostgreSQL `assets`.
- Each new row stores `user_id` (transitioning to `uploaded_by_user_id` in the
  coordinated release), `bucket`, `asset_type`, `status`, `object_key`,
  sanitized `original_name`, `content_type`, `size_bytes`, optional
  `expires_at`, `archived_at`, and `purge_after_at`.
- The legacy `public_url` column remains internal only while Notes and
  Countdown finish their cutovers. US-ASSET-011 removes it; Avatar API DTOs
  and profile responses must not use it.
- `auth_users.current_avatar_asset_id` points at the owned finalized avatar
  asset currently displayed by the profile.
- `note_page_assets.note_page_id` and `note_page_assets.asset_id` are durable
  feature ownership references. `asset_id` is unique, while a Note page can
  have many associated rows.
- The shipped runtime no longer stores any provider-specific avatar identifier
  on `auth_users`.
- When a new finalized avatar replaces the current one, the retired asset row
  is archived for 30 days and the user record points at the replacement asset.
- Cleanup treats expired pending avatar rows as soft-deleted metadata after
  best-effort MinIO object deletion.

## API Contract

All responses use the FluentA envelope.

### Endpoints In Scope

| Method | Endpoint | Behavior |
| --- | --- | --- |
| `POST` | `/api/v1/assets/presign` | Creates a pending owned image asset and returns a presigned direct-upload target. Requires asset type, content type, original file name, and claimed size. |
| `POST` | `/api/v1/assets/finalize` | Verifies the uploaded MinIO object for an owned pending asset and marks it ready. |
| `GET` | `/api/v1/assets?assetType=avatar` | Lists the authenticated user's saved owned avatar assets and marks the current profile avatar. |
| `DELETE` | `/api/v1/assets/{assetId}` | Deletes an owned avatar asset, clearing the current profile avatar if that asset was active. |
| `PUT` | `/api/v1/profile` | Links or removes the current owned finalized avatar asset after explicit Settings-page save. |

## Validation And Error Rules

- Presign requires `assetType=avatar`, `countdown-cover`, or `note-image`.
- Presign requires image content type `image/jpeg`, `image/png`, or
  `image/webp`.
- Presign requires an original file name of 255 characters or fewer and a
  claimed upload size from 1 byte through 2MB.
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
- Finalize succeeds after upload and returns ready asset metadata with durable
  size/content-type values. Avatar list/profile reads issue short-lived signed
  URLs after authorization rather than returning a durable URL.
- The finalized asset row is durable in PostgreSQL, remains owned by the
  authenticated user, and can become the current profile avatar through
  explicit Settings-page save.
- The authenticated user can list saved avatar assets, delete a non-current
  avatar asset without affecting the profile, and delete the current avatar
  asset while the profile clears back to no avatar.
- Replacing or removing the current avatar archives the old owned avatar asset
  for 30 days and leaves the profile on the new authorized signed URL or no
  avatar.
- An abandoned pending avatar upload is eventually removed from both MinIO and
  PostgreSQL metadata by the scheduled cleanup job.
