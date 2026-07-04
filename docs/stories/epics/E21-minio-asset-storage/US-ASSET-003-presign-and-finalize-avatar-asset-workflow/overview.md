# Overview

## Current Behavior

FluentA now has MinIO runtime support and shared asset metadata persistence,
but there is still no shared asset API. Avatar uploads remain tied to
Cloudinary-backed multipart profile saves through `PUT /api/v1/profile`, so the
frontend cannot yet request a presigned upload URL, upload directly to MinIO,
or finalize a shared asset record.

## Target Behavior

FluentA exposes authenticated shared asset endpoints to presign and finalize
avatar uploads. Presign creates a pending asset with a 1-hour expiry and
returns a direct MinIO upload target. Finalize verifies the uploaded object
through MinIO `HEAD`, confirms ownership and pending status, enforces avatar
file rules, and marks the asset finalized.

This story introduces the shared API only. The active Settings page and profile
save flow still switch in a later story.

## Affected Users

- Authenticated learners preparing avatar uploads.
- Maintainers and agents implementing the later Settings/avatar flow cutover.

## Affected Product Docs

- `docs/product/authentication.md`
- `docs/product/assets.md`
- `SPEC.md` Section 18

## Non-Goals

- Settings-page frontend cutover.
- Current-avatar profile propagation.
- Old-avatar replacement and delete semantics.
- Asset list/delete endpoints.
- Cleanup-job behavior for expired pending assets.
