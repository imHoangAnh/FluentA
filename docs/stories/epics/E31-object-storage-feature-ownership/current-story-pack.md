# Current Story Pack: US-ASSET-009 Countdown Private Cover Ownership

## Entry State

- US-ASSET-007 provides shared presign/finalize metadata validation and signed
  avatar rendering; US-ASSET-008 establishes exclusive Note-image ownership.
- Countdown already stores `cover_asset_id`, but its response resolves the
  asset's stored public URL rather than an owner-authorized signed URL.
- D1-D15 in `context.md` are approved.

## Exit State

One Countdown owns at most one cover asset explicitly and safely:

- `countdowns.cover_asset_id` has an enforceable uniqueness constraint that
  prevents a cover from attaching to another business record.
- Countdown DTOs return short-lived cover download data rather than the stored
  public URL.
- Owner-scoped Countdown reads generate a signed URL only for a ready,
  attached `countdown-cover` asset.
- Delete clears the FK; US-ASSET-010 owns the later archive/purge state change.

## Scope

In scope:

- Countdown cover FK constraint/migration and exclusive attachment validation.
- Signed read delivery, DTO/client replacement, and cover rendering tests.
- Countdown delete detachment without a storage delete side effect.
- Product docs plus PostgreSQL/MinIO/browser proof.

Out of scope:

- Cover replacement/edit UI, Restore UI/API, and archive/purge state changes.
- Archive/Restore/Purge state transitions or UI.
- Final public bucket shutdown and legacy `public_url` removal.

## Primary Risks

- Returning an asset public URL would bypass feature-owned delivery.
- A missing uniqueness constraint could attach one cover asset to two records.
- Deleting a cover object now would conflict with the later archive lifecycle.

## Validation Gate

Before story close, require:

1. generated migration, model snapshot, and applied local PostgreSQL proof;
2. unit proof for owner/type/status checks, exclusivity, signed DTO fields,
   and delete detachment;
3. browser proof for direct upload, signed cover rendering, reload, and foreign
   user denial;
4. full backend/frontend regression and production builds.
