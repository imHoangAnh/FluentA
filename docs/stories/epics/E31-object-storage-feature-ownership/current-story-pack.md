# Current Story Pack: US-ASSET-007 Private Storage Foundation And Avatar Cutover

## Entry State

- E21 already provides public MinIO asset upload with `assets.public_url` and
  `auth_users.current_avatar_asset_id`.
- Settings uploads through shared presign/finalize, then saves the finalized
  asset id to the profile.
- The MinIO bootstrap grants anonymous download and the frontend renders
  `avatarUrl`/`publicUrl` directly.
- D1-D15 in `context.md` are approved.

## Exit State

One real feature proves the new architecture end to end:

- Assets uses provider-neutral `IObjectStorageService` and persists target
  private metadata without relying on a public URL.
- Shared presign/finalize validates controlled keys, claimed metadata, actual
  HEAD metadata, and a bounded file signature.
- Auth attaches one owned `READY` avatar through its feature FK.
- Auth/Settings responses supply short-lived avatar download data generated
  only after owner authorization.
- Anonymous MinIO read of the pilot object is denied while its authorized
  presigned GET succeeds.

## Scope

In scope:

- Asset domain/DTO/port changes required by the pilot.
- Target metadata and migration design sufficient for a disposable validation
  database.
- MinIO private presigned GET and bounded signature inspection.
- Auth avatar attachment/download contract and Settings cutover.
- Unit, live PostgreSQL/MinIO, frontend, and focused browser proof.

Out of scope:

- Note and Countdown cutover.
- Archive purge implementation beyond domain seams needed by later stories.
- Final legacy row/object reset and removal of every transitional column.
- Recycle Bin/Restore UI or APIs.

## Primary Risks

- The current Auth profile DTO is also used in auth tokens and global identity
  surfaces, so removing `avatarUrl` can affect more than Settings.
- Presigned GET expiry must not leave stale avatar UI indefinitely.
- MIME headers are client-controlled; finalize needs bounded signature proof.
- Current shared asset list/delete endpoints mix Assets and Auth ownership and
  must not survive as a generic attached-asset authorization bypass.

## Validation Gate

Before source implementation, `harness-validating` must prove:

1. the exact target schema and safe internal transition shape
2. the Auth DTO/identity propagation path affected by the breaking rename
3. AWS SDK/MinIO support for presigned GET and bounded range reads
4. private bucket/CORS behavior in the local runtime
5. deterministic commands and fixtures for owner versus foreign-user proof

