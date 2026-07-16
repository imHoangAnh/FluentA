# Current Story Pack: US-ASSET-008 Note Page Private Image Ownership

## Entry State

- US-ASSET-007 provides shared presign/finalize metadata validation and signed
  avatar rendering, while the final all-feature private-bucket release remains
  deferred to US-ASSET-011.
- Note HTML still carries `data-note-asset-id`, but its existing image `src`
  was not an explicit feature ownership relationship.
- D1-D15 in `context.md` are approved.

## Exit State

One Note page owns its image assets explicitly and safely:

- `note_page_assets` records the relationship from page to asset, with a
  database uniqueness constraint that prevents cross-page asset reuse.
- Note persistence keeps only `data-note-asset-id`, never a public or signed
  source URL.
- An authorized Note-page read hydrates a short-lived signed image URL only
  for current ready, owned Note-image assets.
- Replacing content reconciles page associations in the same database save;
  removing an image detaches it but leaves archive/purge to US-ASSET-010.

## Scope

In scope:

- Note-page asset entity, EF mapping, generated migration, and repository
  reconciliation.
- Sanitization, exclusive attachment authorization, signed read hydration, and
  related tests.
- Browser upload metadata required by the shared US-ASSET-007 presign contract.
- Product docs plus PostgreSQL/MinIO/browser proof.

Out of scope:

- Cross-page image reuse, general attachments, or a file picker.
- Archive/Restore/Purge state transitions or UI.
- Final public bucket shutdown and legacy `public_url` removal.

## Primary Risks

- Persisting a signed or provider URL in stored HTML would violate the target
  data boundary.
- An association lookup not coupled to page ownership could reveal or attach a
  foreign asset.
- Removing an association too early could conflict with the later archive
  lifecycle.

## Validation Gate

Before story close, require:

1. generated migration, model snapshot, and applied local PostgreSQL proof;
2. unit proof for URL stripping, owner/type/status checks, and exclusivity;
3. browser proof for direct upload, signed reload, base64 denial, and foreign
   page denial;
4. full backend/frontend regression and production builds.
