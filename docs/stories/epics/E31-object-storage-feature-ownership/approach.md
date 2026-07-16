# Approach: Object Storage Feature Ownership

## Recommended Work Shape

Mode: `high_risk_initiative`

Deliver one E31 initiative through five dependency-ordered vertical stories.
The external release is intentionally a single breaking cutover, but internal
story checkpoints keep schema, security, feature ownership, and destructive
migration proof reviewable.

## Recommended Sequence

1. Use Avatar as the first end-to-end consumer of the provider-neutral private
   storage contract. Add the target metadata/lifecycle seams, shared
   presign/finalize flow, Auth-owned attachment/download authorization, and
   Settings rendering through short-lived URLs.
2. Replace Note URL-in-HTML ownership with `note_page_assets`, persist only
   durable asset references, and hydrate authorized private image URLs on read.
3. Cut Countdown covers over to feature-owned attachment and private download
   URL generation.
4. Make delete/replace archive assets for 30 days and add job-safe asynchronous
   purge with retry.
5. Apply the intentionally destructive cross-environment reset, remove all
   legacy URL fields and anonymous bucket policy, drain old-object deletion
   work, update contracts, and run release proof.

## Migration And Release Posture

- Internal development may use additive/transitional schema while the stories
  are incomplete. No transitional field is part of the released contract.
- Because Avatar, Note image, and Countdown cover share the single approved
  bucket, the bucket policy changes from anonymous download to private only
  after US-ASSET-008 and US-ASSET-009 have replaced their public-URL
  consumers. Activating it earlier would break those unfinished consumers.
  US-ASSET-007 implements and tests the private delivery seam without making
  that shared runtime policy change.
- The final release clears all old Avatar, Note image, and Countdown cover
  relationships instead of backfilling them.
- EF migration handles durable database reset and copies old object locations
  into a durable deletion queue before old asset rows are discarded.
- A registered background job automatically drains that queue through
  `IObjectStorageService`, records failures, and retries until old objects are
  gone. The migration itself never performs provider I/O.
- The reset runs in every environment without an environment guard, as locked
  by D10.
- Rollback cannot restore deleted data. A migration `Down()` can restore schema
  shape only; release notes and validation evidence must state that explicitly.
- Backend and frontend deploy as one coordinated release. Mixed old/new client
  versions are unsupported.

The queue design is a planning recommendation, not assumed feasibility. E31
validation must prove it can preserve old object keys long enough to delete
them without retaining them as active assets.

## Target Storage Contract

Application code depends on `IObjectStorageService`, expressed in provider-
neutral locations (`bucket`, `objectKey`) and operations needed by the approved
scope:

- create presigned PUT
- create presigned GET
- inspect object metadata and a bounded prefix for signature validation
- delete object idempotently

The interface does not expose MinIO SDK types, public-base-URL construction,
or speculative Copy/Move methods. Future providers implement the same contract
without changing feature code.

## Target Asset Metadata

Planning baseline for `assets`:

- `id`
- `bucket`
- `object_key`
- sanitized `original_name`
- `content_type`
- `size_bytes`
- optional `etag` and checksum
- lifecycle `status`
- `uploaded_by_user_id`
- upload expiry
- `archived_at`
- `purge_after_at`
- `deleted_at`
- standard create/update timestamps

The state machine must cover direct upload plus archive/purge:

```text
PENDING_UPLOAD -> READY -> ARCHIVED -> PENDING_DELETION -> DELETED
       |             ^
       +-> FAILED ---+
```

Validation may refine whether failed/expired uploads move directly to
`PENDING_DELETION`, but only `READY` assets can attach or receive a feature-
authorized download URL.

## Feature Relationship Boundaries

- Auth: `auth_users.avatar_asset_id` is nullable and unique as required for one
  current avatar per user.
- Notes: `note_page_assets(note_page_id, asset_id, ...)`; `asset_id` is unique,
  while a page may own many rows.
- Countdown: `countdowns.cover_asset_id` remains nullable and points to one
  exclusive ready cover asset.
- `uploaded_by_user_id` authorizes pending/finalize operations only. Once an
  asset is attached, the owning feature relation controls reads and mutation.

## Threat Model And Security Controls

| Boundary / abuse case | Required control | Required proof |
| --- | --- | --- |
| Client lies about filename, MIME, or size | Boundary allowlist, normalized filename, claimed size cap, signed headers, HEAD recheck, bounded magic-byte inspection | unit tests plus real MinIO invalid-type/oversize/signature cases |
| User presigns an arbitrary key or bucket | Backend-only bucket/key generation from controlled type, user id, UUID, and validated extension | unit/static proof that request DTO accepts no bucket/object key |
| User reads another user's asset by id | Feature-owned authorization and non-disclosing `404`; no generic attached-asset download endpoint | cross-user API tests for Avatar, Notes, Countdown |
| Archived/deleting object remains reachable | `READY` status required before presigning GET; response URL is short-lived and private | status-matrix tests plus runtime 403/404 behavior |
| Public bucket bypasses the API | Remove anonymous download policy only at the coordinated release gate; restrict CORS to configured app origins | anonymous GET denial and CORS preflight proof in US-ASSET-011 |
| Note HTML injects external/base64/script URLs | Sanitize HTML, persist asset ids only, strip supplied image `src`, hydrate server-authorized URLs | stored-XSS/base64/foreign-asset tests |
| Presign abuse causes storage/DB exhaustion | Existing/requested rate controls and pending-upload quotas must be inspected during validation | readiness note; any new rate-limit policy requires explicit approval |
| Credentials leak through code or responses | configuration-only secrets, redacted errors/logs, no credential fields in DTOs | source scan and runtime response inspection |

## Risk Map

| Risk | Why | Proof required |
| --- | --- | --- |
| Destructive reset | D9-D10 intentionally discard existing asset data in every environment | seeded legacy migration proof, deletion-queue drain, explicit row/object counts before and after |
| Breaking API | `publicUrl` and `avatarUrl` disappear in one release | OpenAPI/static scan, backend/frontend coordinated build, focused E2E |
| Private media rendering | Presigned GETs expire while protected pages stay open | expiry-aware feature DTO/tests and browser refresh/reload proof |
| Ownership/IDOR | Business ownership moves from `assets.user_id` to three feature relations | owner/foreign/deleted tests at each feature boundary |
| Archive concurrency | Multiple workers must not purge the same object or expose it during retry | conditional claim/concurrency integration proof and idempotent delete tests |
| Upload spoofing | Object storage trusts client-provided content headers | HEAD plus bounded signature validation against real MinIO |
| Transaction consistency | Feature detach and archive must commit together | live PostgreSQL transaction-failure tests and repository review |

## Rejected Alternatives

1. Keep `public_url` as a compatibility cache. Rejected by D4 and D11.
2. Put generic `owner_type/owner_id` on `assets`. Rejected because PostgreSQL
   cannot enforce the approved feature FKs.
3. Put storage metadata directly in Auth, Notes, and Countdown tables. Rejected
   because provider lifecycle would be duplicated.
4. Add a generic attached-asset download API. Rejected by D15 because it would
   centralize cross-domain authorization inside Assets.
5. Call MinIO from EF migration. Rejected because migrations cannot safely
   execute retryable external I/O.
6. Implement AWS/R2 adapters now. Rejected by D14.

## Expected Integration Boundaries

- Domain: `BoundedContexts/Assets`, Auth User, Note page association, Countdown.
- Application: shared upload lifecycle plus feature-specific attach/download.
- Infrastructure: EF mappings/migrations, MinIO adapter, deletion queue, jobs.
- API: Assets presign/finalize; feature-owned profile/Note/Countdown responses.
- Frontend: shared upload helper; Settings, Notes, Countdown private URL use.
- Runtime: `docker-compose.dev.yml`, appsettings, CORS and MinIO bootstrap.
- Proof: backend unit/integration tests, Vitest, Playwright, MinIO/PostgreSQL
  runtime smoke, OpenAPI/static contract scans.

## Product Docs And Decisions To Update

- `docs/product/assets.md`
- `docs/product/authentication.md`
- `docs/product/notes.md`
- `docs/product/personal-productivity.md`
- `docs/ARCHITECTURE.md`
- decision `0049-private-feature-owned-object-storage-lifecycle.md`

## Stop Conditions

Stop before implementation if validation cannot prove:

- how the migration automatically deletes old objects without provider I/O in
  EF migration
- atomic feature-detach plus archive behavior
- private MinIO GET through feature authorization without a generic download
  bypass
- safe Note HTML hydration without persisted ephemeral URLs
- a credible proof environment for the deliberately destructive reset
