# 0037 MinIO Asset Metadata And Avatar Ownership

Date: 2026-07-03

## Status

Accepted

## Context

Feature 18 changes FluentA avatar storage from a Cloudinary-specific internal
model to a shared MinIO-backed asset foundation. The existing accepted decision
`0035-profile-learning-settings-and-avatar-storage.md` stores avatar ownership
directly on `auth_users` through `avatar_url` and internal
`avatar_public_id`, which is not sufficient for pending uploads, finalize
verification, reusable list/delete flows, or future asset types.

The feature also locks these constraints:

- shared asset metadata must exist immediately
- avatar is the first controlled asset type
- user ownership is the first ownership model
- existing Cloudinary avatars are not migrated or backfilled
- the current shipped profile flow may remain temporarily until presign and
  finalize stories replace it

## Decision

FluentA introduces a shared `assets` table and domain aggregate with:

- required `user_id`
- controlled `asset_type`
- controlled lifecycle `status`
- `object_key`
- `public_url`
- `content_type`
- `size_bytes`
- optional `expires_at`
- standard created/updated/deleted timestamps

`auth_users` gains a nullable `current_avatar_asset_id` foreign key that points
to the current shared avatar asset when one exists.

During the transition, the live profile/avatar flow may continue using the
existing auth-owned `avatar_url` and internal `avatar_public_id` fields until
later Feature 18 stories switch the upload path to presign/finalize. Existing
Cloudinary avatars are left unlinked; there is no migration bridge or backfill
into the new shared asset records.

## Alternatives Considered

1. Keep using only `auth_users.avatar_url` and add object keys later.
   Rejected because the feature explicitly requires shared asset metadata now.
2. Remove `avatar_url` and `avatar_public_id` immediately in the schema pivot.
   Rejected because it would break the still-shipped Settings avatar flow
   before the MinIO finalize path is ready.
3. Backfill existing Cloudinary avatars into shared asset rows.
   Rejected because the locked feature scope explicitly allows current avatars
   to be lost and does not require provider migration.

## Consequences

Positive:

- FluentA now has a reusable owner-scoped asset model for later presign,
  finalize, list, delete, and cleanup stories.
- Asset lifecycle state is explicit instead of being implied by provider
  fields on the user record.
- The current-avatar pointer is durable and no longer depends on a
  provider-specific identifier.

Tradeoffs:

- The schema temporarily carries both the old profile-avatar fields and the new
  shared asset linkage during the transition stories.
- Existing Cloudinary avatars remain outside the shared asset model until users
  upload a new MinIO-backed avatar.
- Later stories must keep the auth-facing `avatarUrl` surface synchronized
  while the upload path is being replaced.

## Follow-Up

- Implement presign and finalize flows against the shared asset model.
- Switch profile/avatar reads and writes to shared asset ownership.
- Remove Cloudinary wiring and transitional `avatar_public_id` storage once the
  MinIO avatar flow is live.

## Superseded Boundary

The temporary dual-field tradeoff described in this decision was completed by
`0041-remove-cloudinary-avatar-runtime-and-legacy-profile-field.md`, which
removed the remaining Cloudinary runtime seam and dropped
`auth_users.avatar_public_id` after the MinIO avatar lifecycle was fully live.
