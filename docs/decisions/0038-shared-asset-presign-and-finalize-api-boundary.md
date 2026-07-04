# 0038 Shared Asset Presign And Finalize API Boundary

Date: 2026-07-03

## Status

Accepted

## Context

`US-ASSET-002` introduced the durable shared asset metadata model, but FluentA
still had no API surface for direct browser upload. The locked Feature 18
decisions require presigned direct upload, shared routes such as
`/api/v1/assets/presign` and `/api/v1/assets/finalize`, server-side MinIO
metadata verification, and no MinIO secret exposure to the frontend.

At the same time, the live Settings/profile avatar flow still uses the older
Cloudinary-backed multipart `PUT /api/v1/profile` path and is not yet ready to
cut over in the same story.

## Decision

FluentA adds a dedicated shared authenticated asset API with:

- `POST /api/v1/assets/presign`
- `POST /api/v1/assets/finalize`

Presign creates the pending owned asset metadata row immediately and returns a
presigned PUT target plus pending asset metadata. Finalize accepts an owned
asset id, verifies the MinIO object by the stored pending object key, enforces
allowed avatar content types and the 2MB limit, and marks the asset finalized.

This story does not update `auth_users.current_avatar_asset_id` or replace the
live `/api/v1/profile` avatar behavior yet. The shared asset API and the
profile cutover remain separate stories.

## Alternatives Considered

1. Extend `PUT /api/v1/profile` to also presign and finalize uploads.
   Rejected because the locked feature direction requires a shared asset API,
   not another auth-specific provider path.
2. Defer pending metadata creation until finalize.
   Rejected because ownership, expiry, and later cleanup all depend on a durable
   pending row before upload completes.
3. Finalize by object key alone.
   Rejected because it weakens ownership verification and couples the public API
   too tightly to storage-path details.

## Consequences

Positive:

- The frontend can move to direct browser upload without receiving MinIO
  secrets.
- Finalize now relies on real MinIO object metadata instead of trusting client
  claims.
- Shared asset semantics are separated cleanly from the auth profile save path.

Tradeoffs:

- The repo temporarily ships both the old profile-avatar upload path and the
  new shared asset API.
- Finalized shared assets are not yet connected to the current profile avatar
  in this story.
- Later stories must still implement profile propagation, replacement cleanup,
  and delete/list behavior.

## Follow-Up

- Switch the Settings avatar flow to the shared asset API.
- Update current-avatar linkage and old-asset replacement behavior.
- Add list/delete and cleanup lifecycle behavior for pending and finalized
  assets.
