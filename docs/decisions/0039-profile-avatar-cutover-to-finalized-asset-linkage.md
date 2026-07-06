# 0039 Profile Avatar Cutover To Finalized Asset Linkage

Date: 2026-07-03

## Status

Accepted

## Context

`US-ASSET-003` introduced the shared authenticated asset presign/finalize API,
but the live Settings page still saved profile avatars through a multipart
Cloudinary contract. Feature 18 requires the shared MinIO asset foundation to
become the real profile-avatar path without losing the explicit-save behavior
that Feature 15 established for Settings.

The cutover also needs clear replacement semantics: a finalized owned avatar
asset must become the current profile avatar, the retired owned avatar asset
must be soft-deleted, and old MinIO objects should be cleaned only after the
durable profile update succeeds.

## Decision

FluentA keeps avatar upload and profile save as two separate boundaries:

- `POST /api/v1/assets/presign`
- `POST /api/v1/assets/finalize`
- `PUT /api/v1/profile`

The Settings page performs `presign -> direct PUT -> finalize` only when the
learner clicks Save profile. After finalize succeeds, the page sends
`avatarAssetId` to `PUT /api/v1/profile` together with `fullName`, `bio`, and
`removeAvatar`.

`PUT /api/v1/profile` now links an owned finalized `avatar` asset as the
current profile avatar by updating `auth_users.current_avatar_asset_id` and the
public `avatar_url`. When the current avatar is replaced or removed, the
retired owned avatar asset metadata is soft-deleted in the durable update, and
old-object deletion runs as best-effort cleanup after the database write has
succeeded.

The frontend caches the finalized `avatarAssetId` in draft state so a retry
after a profile-save failure does not upload the same file again.

## Alternatives Considered

1. Finalize on file selection instead of Save profile.
   Rejected because it breaks explicit-save semantics and creates avoidable
   finalized-orphan assets when the learner changes their mind.
2. Keep multipart `PUT /api/v1/profile` and upload bytes through the auth
   endpoint.
   Rejected because Feature 18 requires the shared asset API to become the live
   avatar flow, not a sidecar path.
3. Roll profile changes back when old-object deletion fails after commit.
   Rejected because locked decision D6 requires old-object cleanup only after
   the durable profile update succeeds; post-commit cleanup therefore cannot be
   the basis for restoring the old profile state.

## Consequences

Positive:

- The shipped Settings flow now uses the shared MinIO asset foundation.
- Explicit Save profile behavior is preserved even with direct browser upload.
- Retry behavior avoids duplicate uploads once an avatar file has already been
  finalized successfully.

Tradeoffs:

- The frontend now orchestrates a multi-step save flow for new avatar files.
- Best-effort post-commit object cleanup can still leave a stray MinIO object
  if storage deletion fails.
- Full Cloudinary package and code removal still remains a later cleanup story.

## Follow-Up

- Add list/delete asset APIs and pending-upload cleanup behavior.
- Remove the remaining Cloudinary package and transitional code paths.
- Revisit whether post-commit object-cleanup failures need stronger operational
  visibility once a production storage decision exists.
