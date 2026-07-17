# Current Story Pack: US-ASSET-011 Destructive Contract Migration And Release Proof

## Entry State

- US-ASSET-007 through US-ASSET-010 establish private feature ownership and
  the archive/purge lifecycle, while transitional URL-era columns remain.
- The shared bucket previously permitted anonymous download and the application
  still retained the generic Assets list/delete compatibility surface.
- D1-D15 in `context.md` are approved.

## Exit State

The coordinated release is intentionally destructive and private:

- A migration queues every legacy object key, clears asset records and feature
  links, removes Note image tags, and drops `public_url`/`avatar_url`.
- New assets use `uploaded_by_user_id`, durable object metadata, private bucket
  policy, and owning-feature signed reads only.
- The registered retry job drains the durable legacy-object queue; no old object
  is reachable through an application API during the drain.

## Scope

In scope:

- Irreversible reset migration, durable legacy object-deletion queue, and
  uploader-audit rename.
- Private MinIO bootstrap/startup enforcement and removal of URL-at-rest plus
  generic Assets list/delete contracts.
- Product/release docs plus static, unit, database, and build proof.

Out of scope:

- Recovery/backfill, compatibility API, environment guard, Restore UI/API, or
  Recycle Bin UI.

## Primary Risks

- The reset is irreversible and applies in every environment.
- A forgotten legacy URL or anonymous policy would bypass feature authorization.
- A stalled deletion queue must remain observable and retryable rather than
  silently dropping object-cleanup evidence.

## Validation Gate

Story close requires:

1. generated irreversible migration, model snapshot, and applied local
   PostgreSQL before/after counts;
2. static contract scan and full backend/frontend regression builds;
3. private MinIO bootstrap proof and scheduled queue registration;
4. browser and live scheduled-drain proof before a production release.

## Closeout Status

All four gates are satisfied. The applied migration reset 21 tracked legacy
assets into the durable deletion queue, the live worker drained all 21 keys,
the bucket is private with direct anonymous access denied, and the focused
Avatar/Note/Countdown browser release suite passed 5/5. Full command evidence
and the seven private, untracked local-development residual objects are recorded
in the US-ASSET-011 `validation.md`.
