# US-ASSET-007 Overview

## Current Behavior

Avatar upload uses shared presign/finalize, stores `Asset.PublicUrl`, links
`auth_users.current_avatar_asset_id`, duplicates the URL on `auth_users`, and
renders from an anonymously readable MinIO bucket.

## Target Behavior

Avatar becomes the first vertical proof of provider-neutral private assets.
The shared lifecycle creates a controlled pending upload and verifies the real
object before `READY`; Auth owns attachment and download authorization; the
Settings UI renders a short-lived URL without any durable URL column.

## Affected Users

- Authenticated learners uploading, replacing, removing, or viewing avatars.

## Affected Product Docs

- `docs/product/assets.md`
- `docs/product/authentication.md`

## Non-Goals

- Note/Countdown cutover.
- Restore UI/API.
- AWS/R2 adapters.
- Final release-wide legacy reset.

