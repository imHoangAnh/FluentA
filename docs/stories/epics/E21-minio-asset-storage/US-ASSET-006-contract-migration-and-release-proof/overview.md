# Overview

## Current Behavior

`US-ASSET-005` already shipped the full MinIO-backed avatar lifecycle, but the
repo still carried dead Cloudinary-era runtime and documentation drift:
unused provider code, an unused `avatar_public_id` profile field, and older
Feature 15/decision text that still read like active Cloudinary behavior.

## Target Behavior

The shipped avatar/runtime path contains no Cloudinary provider seam, the
legacy `auth_users.avatar_public_id` field is removed from both the runtime
model and local schema, and the durable product/decision/story surface all
describe the same final MinIO asset contract.

## Affected Users

- Authenticated learners using the shipped avatar flow.
- Future maintainers reading product, story, and decision artifacts for Feature
  15 and Feature 18.

## Affected Product Docs

- `docs/product/authentication.md`
- `docs/product/assets.md`
- `SPEC.md`

## Non-Goals

- Introducing new non-avatar asset types.
- Choosing staging/production object storage.
- Adding signed/private read behavior.
