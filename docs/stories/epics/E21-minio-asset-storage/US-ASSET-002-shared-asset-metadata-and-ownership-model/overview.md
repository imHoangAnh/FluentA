# Overview

## Current Behavior

FluentA now has local MinIO runtime support and a reusable backend
object-storage seam, but durable profile/avatar ownership is still modeled in a
Cloudinary-era shape. `auth_users` stores `avatar_url` and internal
`avatar_public_id`, there is no shared asset metadata table, and no user-owned
asset lifecycle exists for pending, finalized, expired, or deleted uploads.

## Target Behavior

FluentA introduces a shared asset metadata model with user ownership, controlled
`avatar` asset type, and controlled lifecycle state. Auth users gain a nullable
link to the current avatar asset so later Feature 18 stories can finalize,
replace, list, and delete avatars through shared asset records instead of
provider-specific identifiers.

This story establishes the durable model only. The shipped Settings avatar flow
does not switch to presign/finalize yet.

## Affected Users

- Authenticated learners with profile avatars.
- Maintainers and agents implementing later Feature 18 asset stories.

## Affected Product Docs

- `docs/product/authentication.md`
- `docs/ARCHITECTURE.md`
- `SPEC.md` Section 18

## Non-Goals

- Presign/finalize asset endpoints.
- Direct browser upload flow in the Settings page.
- Asset list/delete product endpoints.
- Cleanup job behavior for expired pending uploads.
- Production/staging storage-provider decisions.
