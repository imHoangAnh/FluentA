# US-NOTE-003 Overview

## Story Outcome

Turn the shipped Note shell into a writable Note workspace by reusing the
Journal rich-text editor, persisting Note page edits through the Note API, and
enforcing the locked save behavior for blur and page switching.

## Why This Story Exists

- `US-NOTE-002` proved the `/notes` route, board/page shell, and page-detail
  loading, but selected pages are still read-only placeholders.
- The core Note product value depends on actual writing, not just navigation.
- Locked decision `D1` introduces a higher-risk save contract than Journal’s
  delayed autosave alone, so this story isolates that behavior before image
  upload complexity arrives.

## User-Visible Behaviors

- A selected Note page opens with editable title and rich-text content.
- Note edits show save-state feedback.
- Blurring edited fields saves the page.
- Switching to another page saves the current draft first, then opens the next
  page.
- Failed saves do not throw away local edits.
- Newly created blank Note pages open ready to edit immediately.

## Dependencies

- Requires shipped `US-NOTE-001` Note CRUD API.
- Requires shipped `US-NOTE-002` Note shell and page-detail loading.
- Unblocks `US-NOTE-004` embedded image upload and cleanup.

## Non-Goals

- Embedded image upload and reconciliation.
- Note delete/rename UX.
- Search and cross-board filtering.
