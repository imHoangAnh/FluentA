# Design

## Domain Model

No product domain entity changes in this story. The work introduces the local
runtime and infrastructure seam that later asset-domain stories will consume.

## Application Flow

The backend gains a storage-provider boundary that can later support the
Feature 18 asset lifecycle:

- issue presigned upload URLs
- inspect uploaded object metadata
- build public URLs
- delete objects

This story proves those capabilities are structurally supportable in the repo
without yet exposing a user-facing asset API.

## Interface Contract

No user-facing HTTP or frontend contract changes are shipped in this story.
Any temporary runtime probe endpoint or adapter proof must stay scoped to
validation needs and not silently become the full product contract.

## Data Model

No EF migration or durable asset metadata table is added in this story.
Persistent asset metadata belongs to the next story.

## UI / Platform Impact

Local development gains a MinIO service in `docker-compose.dev.yml` and a
documented development bucket/bootstrap path. The story must keep Windows
PowerShell and the repo-root Docker workflow usable.

## Observability

Validation evidence should capture:

- the MinIO service definition and bucket/bootstrap mechanism
- the local endpoint/public base URL shape
- backend configuration boundaries for safe local credentials only

## Alternatives Considered

1. Delay MinIO runtime work until the asset metadata story.
   Rejected because later presign/finalize planning depends on a real local
   storage runtime and public URL shape.
2. Keep using Cloudinary for local development while planning MinIO for later.
   Rejected because Feature 18 locks MinIO as the local development storage
   foundation now.
