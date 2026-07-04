# Overview

## Current Behavior

FluentA already supports MinIO-backed avatar presign/finalize and the shipped
Settings page can save a finalized avatar asset as the current profile avatar.
However, learners cannot yet review or delete saved avatar assets, and pending
uploads that never reach finalize still remain in shared metadata plus MinIO.

## Target Behavior

The shared asset API supports `GET /api/v1/assets?assetType=avatar` and
`DELETE /api/v1/assets/{assetId}` for owned avatar assets. Settings shows saved
avatars, allows deleting either a retired avatar or the current avatar, and
clears the profile avatar when the deleted asset was active. Expired pending
avatar uploads are removed automatically from metadata plus MinIO by a
recurring cleanup job.

## Affected Users

- Authenticated learners managing profile avatars in Settings.

## Affected Product Docs

- `docs/product/assets.md`
- `docs/product/authentication.md`

## Non-Goals

- Removing the remaining Cloudinary package and transitional wiring.
- Supporting non-avatar asset types.
- Signed/private asset download behavior.
