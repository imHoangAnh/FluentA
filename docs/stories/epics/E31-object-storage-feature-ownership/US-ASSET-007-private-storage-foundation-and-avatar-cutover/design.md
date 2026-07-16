# US-ASSET-007 Design

## Domain Model

Introduce the target provider-neutral Asset fields and state vocabulary. Only
`READY` Avatar assets initiated by the authenticated uploader can be selected
for the profile. Auth is authoritative after attachment.

## Application Flow

1. Shared presign accepts controlled asset type, original name, content type,
   and claimed size; the backend generates bucket/key/id.
2. Browser PUTs directly with signed headers.
3. Shared finalize performs HEAD plus bounded magic-byte inspection, then marks
   the pending row `READY`.
4. Profile save validates uploader/type/status and sets `avatar_asset_id`.
5. Auth profile/settings reads authorize the current user and request a short-
   lived GET URL from `IObjectStorageService`.

## Interface Contract

- Keep `POST /api/v1/assets/presign` and `/finalize` as shared lifecycle APIs.
- Remove URL fields from shared Asset DTOs.
- Profile/auth DTOs use `avatarAssetId`, `avatarDownloadUrl`, and
  `avatarDownloadUrlExpiresAt` for the coordinated breaking client.
- Attached avatar delete/remove is Auth behavior, not generic Assets ownership.

## Data Model

Prepare `assets.bucket`, `original_name`, `uploaded_by_user_id`, lifecycle and
archive timestamps, content metadata, and unique `(bucket, object_key)`. The
pilot may use additive transitional mapping internally; US-ASSET-011 removes
all legacy fields before release.

## UI / Platform Impact

Settings and shared identity surfaces stop reading `avatarUrl`. The client must
refresh profile data after expiry/reload instead of persisting the URL.

## Observability

Log asset id/type/status and storage operation outcome, never presigned URLs,
credentials, or full provider errors.

## Alternatives Considered

1. Add a generic asset download endpoint. Rejected by D15.
2. Trust HEAD content type alone. Rejected because upload headers are
   client-controlled.

