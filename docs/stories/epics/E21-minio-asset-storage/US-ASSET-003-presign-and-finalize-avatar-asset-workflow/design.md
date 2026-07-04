# Design

## Domain Model

Reuse the shared `Asset` aggregate introduced in `US-ASSET-002`.

Presign creates a new pending owned asset row with:

- `AssetType = Avatar`
- `Status = Pending`
- server-generated `ObjectKey`
- `PublicUrl`
- requested `ContentType`
- initial `SizeBytes = 0`
- `ExpiresAt = now + 1 hour`

Finalize transitions that pending row to `Finalized` only after MinIO metadata
verification succeeds.

## Application Flow

Add a dedicated shared asset application service.

Presign flow:

1. Validate `assetType` and content type.
2. Generate a new asset id and object key scoped to the authenticated user.
3. Create the pending metadata row.
4. Ask `IAssetObjectStorage` for a presigned PUT URL.
5. Return the asset id, upload URL, expiry, and pending metadata.

Finalize flow:

1. Load the owned asset by id.
2. Require `Pending` status and a non-expired pending window.
3. `HEAD` the stored object key through MinIO.
4. Require object existence, allowed content type, expected pending key, and
   at most 2MB size.
5. Mark the asset finalized and persist the new size/content-type values.
6. Return finalized asset metadata.

This story does not update `auth_users.current_avatar_asset_id` yet.

## Interface Contract

Shared asset API routes:

- `POST /api/v1/assets/presign`
- `POST /api/v1/assets/finalize`

The first supported `assetType` is `avatar`.

Responses return shared asset metadata plus the presigned upload target where
appropriate. Errors cover unsupported type, validation failures, owned-asset
not found, expired pending uploads, invalid uploaded object metadata, and
storage unavailability.

## Data Model

No new table is required beyond the existing `assets` schema. Presign writes a
pending row, and finalize updates that row in place.

## UI / Platform Impact

No shipped frontend route changes yet. The story unblocks the future Settings
cutover by providing the server-side API contract that direct browser upload
will consume.

## Observability

Validation evidence should capture:

- the exact presign/finalize route behavior
- real MinIO PUT plus finalize success
- whether the generated asset row transitions from pending to finalized

## Alternatives Considered

1. Continue using `PUT /api/v1/profile` to upload avatar bytes and only add
   MinIO later.
   Rejected because the locked feature direction requires presigned direct
   uploads.
2. Finalize by object key alone without a pending metadata row.
   Rejected because ownership, expiry, and cleanup all depend on durable pending
   asset records.
