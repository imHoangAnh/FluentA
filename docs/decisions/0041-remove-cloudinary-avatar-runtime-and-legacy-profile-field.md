# 0041 Remove Cloudinary Avatar Runtime And Legacy Profile Field

Date: 2026-07-03

## Status

Accepted

## Context

`US-ASSET-004` and `US-ASSET-005` already made the MinIO-backed shared asset
lifecycle the shipped avatar behavior, but the repo still carried two kinds of
release drift:

- dead Cloudinary-era runtime surface:
  - `IAvatarStorage`
  - `CloudinaryAvatarStorage`
  - `CloudinaryDotNet`
  - old auth-only avatar DTO/error/exception types
- transitional profile storage:
  - `auth_users.avatar_public_id`
  - `User.AvatarPublicId`

Feature 18 locked decision D8 requires Cloudinary to be removed from the avatar
flow entirely, with no fallback and no cleanup bridge. Keeping dead provider
runtime or an unused provider-specific profile field would leave the repo
claiming more compatibility than the shipped contract actually has.

## Decision

FluentA removes the remaining Cloudinary avatar runtime seam and the legacy
`avatar_public_id` profile field.

The shipped avatar/runtime contract now keeps only:

- `auth_users.avatar_url`
- `auth_users.current_avatar_asset_id`
- shared asset metadata in `assets`

`User.UpdateProfile(...)` now models only profile text, `avatarUrl`, and
`currentAvatarAssetId`. An EF migration drops `auth_users.avatar_public_id`
from the current schema after the MinIO lifecycle is already live and proven.

Historical Feature 15 and earlier Feature 18 artifacts remain in the repo but
gain explicit superseded notes so they no longer look like active Cloudinary
contract.

## Alternatives Considered

1. Keep `avatar_public_id` as a dormant compatibility column.
   Rejected because it preserves a misleading provider-specific runtime surface
   after the shipped contract has already abandoned Cloudinary.
2. Leave the dead provider code but rely on DI/source reachability alone.
   Rejected because Feature 18 explicitly includes Cloudinary removal proof, so
   the package and adapter should not remain in the repo's active runtime path.
3. Rewrite historical Feature 15 delivery artifacts to look MinIO-native.
   Rejected because those artifacts should remain historically accurate; small
   superseded notes are enough.

## Consequences

Positive:

- The repo's active runtime now matches the shipped MinIO-only avatar story.
- The profile model no longer exposes a provider-specific internal identifier.
- Release proof can verify Cloudinary removal concretely through source, build,
  migration, and smoke evidence.

Tradeoffs:

- Any untouched local/dev row that still depended on `avatar_public_id` loses
  that dormant compatibility path after the migration.
- Historical docs need explicit superseded markers to avoid looking current.

## Follow-Up

- Feature 18 itself is complete after this decision and release proof.
- Future asset work can extend the shared asset model without revisiting
  Cloudinary compatibility.
