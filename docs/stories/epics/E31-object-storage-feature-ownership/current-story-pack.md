# Current Story Pack: US-ASSET-010 Archive And Purge Lifecycle

## Entry State

- US-ASSET-007 through US-ASSET-009 establish signed, feature-owned delivery
  for Avatar, Note images, and Countdown covers.
- Feature detach already removes the visible relationship, but asset objects
  need a recovery window and asynchronous physical deletion.
- D1-D15 in `context.md` are approved.

## Exit State

Detached Avatar, Note-image, and Countdown-cover assets have a recoverable,
safe lifecycle:

- READY assets transition to ARCHIVED for 30 days when their feature detaches;
  archive state blocks signed delivery immediately.
- A bounded hourly job conditionally claims due archives, deletes their objects
  idempotently, marks successes DELETED, and requeues storage failures.
- Retention timestamps and indexed due scans are durable in PostgreSQL.

## Scope

In scope:

- Archive transition and atomic feature detachment for Avatar, Note images, and
  Countdown covers.
- Retention migration, conditional purge claiming, idempotent storage delete,
  retry, and hourly Hangfire registration.
- Product docs plus domain, application, PostgreSQL, and build proof.

Out of scope:

- Archived list, Restore UI/API, manual/admin purge, or Recycle Bin UI.
- Final public bucket shutdown and legacy `public_url` removal.

## Primary Risks

- A non-READY asset receiving a signed URL would defeat immediate access
  revocation.
- Two workers could attempt the same object delete without a conditional claim.
- A storage failure could strand an asset in PENDING_DELETION without requeue.

## Validation Gate

Before story close, require:

1. generated migration, model snapshot, and applied local PostgreSQL proof;
2. domain and application proof for the state transitions, feature detach, and
   successful/failed purge paths;
3. hourly registration proof and full backend/frontend regression builds.
