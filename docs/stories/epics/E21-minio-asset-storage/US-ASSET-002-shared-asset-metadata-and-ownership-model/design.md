# Design

## Domain Model

Add a shared `Asset` aggregate under the Assets bounded context with:

- required owner `UserId`
- controlled `AssetType`
- controlled `AssetStatus`
- `ObjectKey`
- `PublicUrl`
- `ContentType`
- `SizeBytes`
- optional `ExpiresAt`

`AssetType` starts with `Avatar`. `AssetStatus` starts with `Pending`,
`Finalized`, `Expired`, and `Deleted`.

`Auth.User` gains a nullable `CurrentAvatarAssetId` link for the current avatar
asset. The existing `avatar_url` and `avatar_public_id` fields may remain
temporarily in this story so the active Cloudinary-backed profile flow keeps
working until later Feature 18 stories replace it.

## Application Flow

This story adds the domain and persistence seam later asset workflows will use:

- create user-owned pending asset metadata after presign
- finalize owned assets after MinIO verification
- resolve the current avatar asset for profile reads and replacement
- soft-delete old asset metadata after replacement or delete

Only the seam is added here. No new HTTP handlers ship in this story.

## Interface Contract

No new public API route is enabled in this story. Public profile DTOs may keep
returning `avatarUrl` from the existing auth shape until the avatar workflow
stories switch the source to shared asset metadata.

## Data Model

Add an `assets` table with:

- `id`
- `user_id`
- `asset_type`
- `status`
- `object_key`
- `public_url`
- `content_type`
- `size_bytes`
- `expires_at`
- `created_at`
- `updated_at`
- `deleted_at`

Add a nullable `current_avatar_asset_id` column to `auth_users` with a foreign
key to `assets(id)`.

Persist `AssetType` and `AssetStatus` as strings using the repo's existing EF
enum-conversion pattern. Add ownership and query-shape indexes for user, type,
status, and soft-delete filters.

## UI / Platform Impact

No shipped frontend behavior changes in this story. The impact is structural:
later Settings and asset-management stories will target the new shared asset
metadata model instead of provider-specific avatar identifiers.

## Observability

Validation evidence must capture:

- the durable schema shape
- current-avatar linkage semantics
- whether migration generation is fully runnable or constrained by unrelated
  dirty-worktree build failures

## Alternatives Considered

1. Reuse only `auth_users.avatar_url` and add MinIO object keys later.
   Rejected because the locked feature direction requires shared asset metadata
   immediately.
2. Remove Cloudinary-era profile fields in this story.
   Rejected because it would prematurely break the still-shipped avatar flow
   before presign/finalize replacement is ready.
