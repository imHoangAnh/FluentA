# US-NOTE-004 Overview

## Story Outcome

Add first-release Note image support so pasted or dropped image files upload
through the shared asset runtime, render inside Note content after reload, and
do not leak base64 payloads or unbounded orphaned assets.

## Why This Story Exists

- `US-NOTE-003` made Note pages writable, but the Note feature contract still
  promises first-release pasted and dropped image support.
- `SPEC.md` requires reuse of the existing shared asset runtime rather than a
  Note-specific upload endpoint.
- Locked decision `D3` adds a data-lifecycle requirement beyond simple upload:
  when an embedded Note image is removed and the Note is saved, that asset must
  be marked for cleanup.

## User-Visible Behaviors

- Users can paste or drop an image file into the Note editor.
- The editor uploads the image before inserting it into Note content.
- Saved Note content renders the inserted image after reload.
- Persisted Note HTML does not store base64 image payloads.
- Upload failure shows a clear Note-local error without corrupting existing
  content.

## Dependencies

- Requires shipped `US-NOTE-001` Note CRUD API.
- Requires shipped `US-NOTE-003` editable Note pages and save-state behavior.
- Unblocks `US-NOTE-005` release proof for image lifecycle coverage.

## Affected Product Docs

- `docs/product/notes.md`
- `SPEC.md` Section 25
- Feature 18 shared asset rules reused by Note

## Non-Goals

- File-picker uploads or attachment lists.
- Search, sharing, tags, or Note templates.
- Broad editor replacement or redesign outside the Note image seam.
