# 0049 Private Feature-Owned Object Storage Lifecycle

Date: 2026-07-17

## Status

Accepted

## Context

FluentA's shipped E21 asset foundation stores public URLs and treats the upload
user as the main asset owner. Avatar, Note image, and Countdown cover consumers
now need a self-host-first storage model that keeps provider metadata central,
makes business ownership enforceable in each feature, supports private
presigned delivery, and leaves room for later archive/restore behavior.

The user approved the full D1-D15 decision set in
`docs/stories/epics/E31-object-storage-feature-ownership/context.md`, including
the intentionally destructive, unguarded cross-environment reset and
single-release breaking API cutover.

## Decision

- Keep the central table name `assets`.
- Store `bucket` and `object_key`, never durable public or presigned URLs.
- Keep `uploaded_by_user_id` for pending-upload security and audit only.
- Auth, Notes, and Countdown own explicit FKs/association rows and download
  authorization.
- Make all buckets private and generate short-lived feature-authorized GET
  URLs.
- Use one bucket per environment and backend-generated asset-centric keys.
- Allow an asset to attach to at most one business record.
- Implement MinIO behind provider-neutral `IObjectStorageService`; defer other
  providers.
- On detach/replace, archive for 30 days, then claim and purge asynchronously.
- Do not implement Recycle Bin or restore APIs/UI in E31.
- Reset existing assets instead of backfilling; apply the reset automatically
  in every environment and remove old URL contracts in one coordinated
  backend/frontend release.

## Alternatives Considered

1. Keep public URLs or compatibility aliases. Rejected because private storage
   and a clean breaking contract were explicitly selected.
2. Store asset metadata inside each feature. Rejected because it duplicates
   lifecycle and provider behavior.
3. Use polymorphic owner columns on `assets`. Rejected because database FKs
   cannot enforce them across multiple feature tables.
4. Purge immediately on detach. Rejected to preserve a future 30-day restore
   window.
5. Implement cloud providers in this initiative. Rejected because cloud-ready
   boundaries are sufficient for the approved scope.

## Consequences

Positive:

- Storage-provider details no longer leak into durable product contracts.
- Feature authorization is explicit and testable against IDOR.
- Private object delivery and archive retention match the desired long-term
  product direction.
- A future restore feature can reactivate archived rows without re-uploading.

Tradeoffs:

- The release is deliberately destructive and backward-incompatible.
- Backend and frontend require coordinated deployment and downtime planning.
- Short-lived download URLs require expiry-aware client behavior.
- Async deletion needs durable retry/concurrency proof.
- Rollback cannot restore reset or purged user files.

## Follow-Up

- Deliver US-ASSET-007 through US-ASSET-011.
- Add a separate future initiative for archived-asset listing, Restore, and
  permanent purge controls.
- Add AWS S3 or R2 adapters only when a deployment requires them.
