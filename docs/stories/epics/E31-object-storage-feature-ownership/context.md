# E31 Object Storage Feature Ownership Context

## Initiative Boundary

Redesign FluentA's existing MinIO-backed shared asset foundation so storage
metadata remains centralized while each product feature owns its durable asset
relationship. The target remains self-hosted first and S3-compatible, with no
provider URL persisted in PostgreSQL.

This initiative replaces the shipped E21 public-URL asset contract for all
currently supported asset types:

- profile avatars
- embedded Note images
- Countdown covers

The resulting conventions are also the default for future uploaded-file
features.

## Existing Behavior

- PostgreSQL `assets` currently stores `user_id`, `asset_type`, `status`,
  `object_key`, `public_url`, content metadata, expiry, and soft-delete fields.
- `auth_users.current_avatar_asset_id` points to the current avatar asset while
  `auth_users.avatar_url` duplicates its render URL.
- Countdown records link a finalized shared cover asset.
- Note HTML persists both a public image URL and `data-note-asset-id`; there is
  no durable Note-page-to-asset relationship table.
- `IAssetObjectStorage` and `MinioAssetObjectStorage` already support presigned
  upload, object metadata lookup, public URL construction, and best-effort
  deletion.
- The local MinIO bucket currently supports anonymous reads for shipped public
  asset URLs.

Current product contracts:

- `docs/product/assets.md`
- `docs/product/notes.md`
- `docs/product/authentication.md`
- `docs/product/personal-productivity.md`

Historical implementation evidence remains under
`docs/stories/epics/E21-minio-asset-storage/` and must not be rewritten as if
the earlier public-URL model had never shipped.

## Locked Decisions

### D1 - Initiative scope

Apply the redesign to avatar, `note-image`, and `countdown-cover` assets in one
initiative, and make it the convention for future asset types.

### D2 - Central metadata with feature-owned relationships

Keep one central asset metadata table. Business ownership is represented by
feature relationships:

- `auth_users.avatar_asset_id -> assets.id`
- the Countdown cover relationship points to `assets.id`
- Note pages use a `note_page_assets` association because one page can contain
  multiple images

The central Assets boundary owns storage lifecycle; Auth, Notes, and Countdown
own the business relationship and authorization semantics.

### D3 - Keep the `assets` name

Do not rename `assets` to `files`.

### D4 - Private storage and ephemeral downloads

All assets are private. PostgreSQL stores no public, provider, CDN, or
presigned URL. An authorized read generates a short-lived presigned download
URL. Note persistence keeps durable asset references rather than a durable
image `src` URL.

### D5 - Uploader is not business owner

`assets.uploaded_by_user_id` records who initiated the upload and protects the
pending upload lifecycle. It is an audit/security field, not the source of
business ownership after attachment. Feature relationships are authoritative.

### D6 - Exclusive business attachment

One asset may be attached to at most one business record. A Note page can own
many asset rows, but each `note_page_assets.asset_id` is unique. Reusing the
same asset in another page or feature requires a new asset/object. The same
asset may appear more than once inside its owning Note page content.

### D7 - One private bucket per environment

Use one private bucket per environment. Continue storing `assets.bucket` so
records remain portable and later providers or bucket layouts do not require a
schema redesign.

### D8 - Asset-centric object keys

Object keys are backend-generated, collision-free, and independent of the
eventual business record. They use a controlled asset-type prefix, uploader
scope, an asset UUID, and an extension derived from validated content type.
Original filenames are never object keys.

Representative shape:

```text
avatars/users/{userId}/{assetId}.png
note-images/users/{userId}/{assetId}.webp
countdown-covers/users/{userId}/{assetId}.jpg
```

### D9 - Destructive reset instead of backfill

Do not migrate or backfill existing asset metadata, feature links, avatar
values, Note image references, Countdown covers, or stored objects. The cutover
intentionally resets the existing asset population.

### D10 - Reset applies automatically in every environment

The destructive reset is not limited to local development and has no
environment guard. Applying the cutover in any environment resets the existing
asset data and relationships. Planning and release documentation must label
this behavior prominently; validation must prove exactly what is deleted and
what remains.

### D11 - Single-release breaking API cutover

Backend and frontend switch together. Remove `publicUrl` and `avatarUrl`
compatibility fields instead of staging a dual contract. Client-facing asset
data uses durable asset identifiers plus ephemeral `downloadUrl` and
`downloadUrlExpiresAt` values where the owning feature authorizes a read.

### D12 - Archive before physical purge

Delete and replace operations immediately detach the feature relationship and
move the old asset from `READY` to `ARCHIVED`. Archived assets cannot receive a
download URL. They retain their object for 30 days and carry `archived_at` plus
`purge_after_at`.

The purge lifecycle is:

```text
READY -> ARCHIVED -> PENDING_DELETION -> DELETED
```

An hourly background job claims expired archives by moving them to
`PENDING_DELETION`, deletes the object, and marks successful purges `DELETED`
with `deleted_at`. Storage failures retry asynchronously without making the
original feature delete/replace operation fail.

### D13 - Archive foundation only

This initiative implements archive-ready schema and lifecycle, automatic
archive on delete/replace, download blocking, and background purge. Recycle Bin
UI, archived-asset listing, restore, and manual permanent-purge APIs are
deferred to a later feature.

### D14 - MinIO implementation behind a cloud-ready port

Implement MinIO only. Application/business logic depends on a provider-neutral
`IObjectStorageService`; MinIO-specific SDK types, errors, endpoint behavior,
and configuration remain in Infrastructure. AWS S3 and Cloudflare R2 adapters
are future work and must not require schema or business-rule changes.

### D15 - Hybrid API boundary

Presign and finalize remain shared asset-lifecycle operations. Attachment,
authorization, and download URL generation are exposed through the owning
feature boundary:

- Auth owns avatar attachment and download authorization.
- Notes owns Note-page image attachment and download authorization.
- Countdown owns cover attachment and download authorization.

The Assets application boundary must not become a cross-domain business
ownership service.

## Explicit Exclusions

- AWS S3, Cloudflare R2, Garage, SeaweedFS, RustFS, or Ceph implementations.
- Recycle Bin UI.
- Archived-asset list, restore, or admin/manual purge endpoints.
- Sharing one asset across multiple business records.
- Preserving or backfilling existing asset data during cutover.
- Compatibility aliases for `publicUrl` or `avatarUrl`.
- Original filenames as object keys.

## Deferred Technical Questions For Planning And Validation

- Exact `assets` column inventory, enum values for upload failure/expiry, and
  indexes/constraints around lifecycle scans and exclusive attachment.
- The executable mechanism that makes the deliberately unguarded cross-
  environment database and object-storage reset complete and observable.
- Transaction boundaries for attach/archive operations and job-safe claiming
  of expired archives.
- Presigned upload/download expiry values and frontend refresh behavior when a
  download URL expires while a protected page remains open.
- The response shape each owning feature uses to hydrate private avatar, Note,
  and Countdown media without persisting ephemeral URLs.
- Object-storage contract tests that prove the MinIO adapter honors the
  provider-neutral port without requiring future provider implementations.
- Release ordering and downtime requirements for the intentional breaking API
  plus destructive data reset.

## Exploration Gate

No planning, story slicing, migration generation, implementation, or data reset
may begin until the user approves this locked decision set.
