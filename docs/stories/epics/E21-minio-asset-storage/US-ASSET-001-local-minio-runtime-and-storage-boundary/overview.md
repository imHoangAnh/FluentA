# Overview

## Current Behavior

FluentA local development currently provisions PostgreSQL and Redis only.
Avatar storage is implemented through backend-mediated Cloudinary upload/delete,
and there is no shared object-storage runtime or reusable storage-provider seam
for future asset types.

## Target Behavior

FluentA local development provisions MinIO with a default development bucket,
and the backend exposes a reusable storage boundary for presign, object
metadata inspection, public URL generation, and delete operations. This story
establishes the runtime and backend seam only; avatar product flow changes stay
for later Feature 18 stories.

## Affected Users

- Maintainers running FluentA locally.
- Agents implementing later Feature 18 stories.

## Affected Product Docs

- `README.md`
- `docs/product/authentication.md`
- `SPEC.md` Section 18

## Non-Goals

- Asset metadata schema.
- Presign/finalize API.
- Settings UI upload flow.
- Cloudinary removal from the shipped avatar flow.
- Production/staging storage decisions.
