# US-ASSET-008 Design

## Domain Model

Add a Note-page-to-asset association with unique `asset_id`. A page can own
many ready Note images; an asset can belong to only one business record.

## Application Flow

Save sanitizes HTML, extracts ids, strips supplied `src`, validates ready
uploads, attaches new ids, and archives removed ids in one transaction. Read
loads only the owned active page and its ready associations, generates URLs,
and hydrates response HTML without mutating persisted content.

## Interface Contract

Note endpoints remain feature-owned. Shared APIs only presign/finalize. Note
DTOs may include hydrated content and URL-expiry metadata; no generic asset GET
is added.

## Data Model

Create `note_page_assets` with page FK, unique asset FK, timestamps, and indexes
for page reads. Existing Note image data is not backfilled.

## UI / Platform Impact

The editor inserts durable asset ids, renders server-hydrated URLs, and reloads
the page when URLs expire. Client-supplied external/base64 sources remain
invalid.

## Observability

Record page id, association counts, and archive counts without logging Note
HTML or presigned URLs.

## Alternatives Considered

1. Keep ownership only in HTML. Rejected because it lacks enforceable FKs.
2. Share one image across pages. Rejected by D6.

