# Overview

## Current Behavior

FluentA already supports MinIO-backed avatar presign/finalize through the
shared asset API, but the live Settings page still sends avatar bytes through a
multipart profile save contract. That means the shipped avatar flow is still
Cloudinary-shaped even though the shared MinIO asset foundation now exists.

## Target Behavior

The Settings page keeps explicit-save UX but, when a learner chooses a new
avatar, Save profile triggers `presign -> direct PUT -> finalize -> profile
save`. `PUT /api/v1/profile` accepts `avatarAssetId`, links the owned finalized
avatar as the current profile avatar, soft-deletes any retired owned avatar
asset metadata, and performs best-effort old-object cleanup after the durable
profile update succeeds.

## Affected Users

- Authenticated learners editing their Settings profile.

## Affected Product Docs

- `docs/product/authentication.md`
- `docs/product/assets.md`

## Non-Goals

- Asset list/delete endpoints.
- Cleanup-job handling for expired pending uploads.
- Full Cloudinary package/code removal.
