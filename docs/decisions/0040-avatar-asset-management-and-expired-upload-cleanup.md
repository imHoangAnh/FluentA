# 0040 Avatar Asset Management And Expired Upload Cleanup

Date: 2026-07-03

## Status

Accepted

## Context

`US-ASSET-004` made finalized MinIO avatar assets the real Settings/profile
flow, but the first shared asset contract still lacked the rest of Feature 18's
locked lifecycle: users could not list or delete saved avatar assets, and
abandoned pending uploads still remained in shared metadata plus MinIO.

Feature 18 locked decisions D14, D15, D20, and D21 require the first shared
asset API to include list/delete behavior and to remove expired pending uploads
automatically. The delete path also crosses Auth-owned profile state whenever
the deleted asset is still the current avatar.

## Decision

FluentA extends the shared asset boundary with two more authenticated avatar
operations:

- `GET /api/v1/assets?assetType=avatar`
- `DELETE /api/v1/assets/{assetId}`

List returns the authenticated user's non-deleted owned avatar assets, newest
first, and includes an `isCurrentAvatar` flag derived from
`auth_users.current_avatar_asset_id`.

Delete remains owner-scoped and uses the same non-disclosure behavior as the
rest of the asset/profile contract. When the deleted asset is the current
avatar, the durable write clears `current_avatar_asset_id` and `avatar_url`
together with the asset soft deletion. MinIO object deletion stays best-effort
after the durable user/asset write succeeds.

Expired pending upload cleanup runs as an internal recurring Hangfire job in
the Worker process. The cleanup path selects assets already marked `Expired` plus
`Pending` assets whose `expires_at` has passed, attempts MinIO object deletion
best-effort, marks pending rows expired when needed, then soft-deletes the
metadata.

## Alternatives Considered

1. Keep list/delete behavior inside Auth-specific Settings endpoints.
   Rejected because locked decision D20 requires shared asset list/delete
   capabilities, not another avatar-only side path.
2. Clear the current avatar profile state in a second follow-up write after
   deleting the asset row.
   Rejected because the profile/avatar pointer and asset deletion need one
   durable ownership-consistent update.
3. Rely on future MinIO lifecycle rules instead of an application cleanup job.
   Rejected because locked decisions D14-D15 require FluentA to own abandoned
   pending-upload cleanup now.

## Consequences

Positive:

- Learners can manage saved avatar assets directly from Settings.
- Current-avatar deletion has one durable ownership-safe behavior across asset
  metadata and profile state.
- Expired pending uploads no longer accumulate indefinitely in MinIO or shared
  metadata.

Tradeoffs:

- The shared asset API now has a user-visible management surface before other
  asset types exist.
- Best-effort object deletion can still leave a stray MinIO object if storage
  deletion fails after the durable delete.
- Cleanup proof needs both metadata and object-storage evidence, not just unit
  tests.

## Follow-Up

- Remove the remaining Cloudinary package and transitional avatar wiring.
- Align the final Feature 18 product docs and superseded decisions with the
  completed MinIO lifecycle.
- Revisit operational visibility for cleanup-delete failures when a production
  storage provider is chosen.

## Superseded Boundary

The first two follow-up items were completed by
`0041-remove-cloudinary-avatar-runtime-and-legacy-profile-field.md`, which
closed the remaining Feature 18 release-alignment cleanup.
