# Notes

## Product Boundary

This contract covers the shipped first-release Note Workspace behavior for
Feature 25. FluentA provides an authenticated `/notes` surface with owner-scoped
boards and pages, Journal-style rich-text editing, blur and page-switch save
behavior, pasted or dropped Note image upload through the shared asset runtime,
and save-time removed-image cleanup marking.

Search, tags, sharing, templates, file-picker uploads, attachment libraries,
and cross-feature linking remain out of scope.

## Outcomes

- A logged-in user can enter `/notes` from the protected app navigation.
- A logged-in user can list only their own active Note boards.
- A logged-in user can right-click a Note Board or Page to rename or delete
  that exact item with accessible dialogs and entity-specific success feedback.
- A logged-in user can create a Note board and create a Note page inside it.
- New Note pages open immediately with blank content.
- A logged-in user can get and update one owned active Note page.
- Note Workspace uses the same board-and-page rail pattern as Vocabulary. A
  selected page shows its editable title with its date directly below, followed
  by the rich-text editor; word and character counters are not displayed.
- Note page edits show save-state feedback, save on blur, and save before a
  page switch completes.
- A user can paste or drop an image file into a Note page.
- Saved Note content renders uploaded images after reload without storing base64
  image payloads.
- Removing an embedded Note image and then saving marks that Note-owned asset
  for cleanup.
- Deleting a Note board soft-deletes its active Note pages in the same first
  release lifecycle.

## Ownership And Authorization Rules

- Every Note board belongs to exactly one authenticated user.
- Every Note page belongs to exactly one active Note board owned by the same
  user.
- Every pasted or dropped Note image must be an owned finalized shared
  `note-image` asset.
- Missing, deleted, or foreign-user Note boards return `404
  NOTE_BOARD_NOT_FOUND`.
- Missing, deleted, or foreign-user Note pages return `404
  NOTE_PAGE_NOT_FOUND`.
- Deleted Note boards and Note pages are excluded from list and get endpoints.

## API Contract

All responses use the FluentA envelope.

| Method | Endpoint | Behavior |
| --- | --- | --- |
| `GET` | `/api/v1/notes/boards` | List active owned Note boards with lightweight page summaries. |
| `POST` | `/api/v1/notes/boards` | Create an owned Note board. |
| `PATCH` | `/api/v1/notes/boards/{boardId}` | Rename an owned active Note board. |
| `DELETE` | `/api/v1/notes/boards/{boardId}` | Soft-delete an owned active Note board and its active pages. |
| `POST` | `/api/v1/notes/boards/{boardId}/pages` | Create an owned active Note page inside the selected board. |
| `GET` | `/api/v1/notes/pages/{pageId}` | Get one active owned Note page with content. |
| `PATCH` | `/api/v1/notes/pages/{pageId}` | Update supplied fields on one active owned Note page. |
| `DELETE` | `/api/v1/notes/pages/{pageId}` | Soft-delete one active owned Note page. |
| `POST` | `/api/v1/assets/presign` | Create a Note image direct-upload target when `assetType=note-image`. |
| `POST` | `/api/v1/assets/finalize` | Finalize a previously uploaded Note image asset. |

## Validation Rules

- Board name is required and must be at most 120 characters after trimming.
- Page name is required and must be at most 240 characters after trimming.
- Page content is sanitized before persistence and must be at most 100,000
  characters.
- Note images accept JPG, PNG, and WebP only and follow the shared 2MB upload
  limit.
- Persisted Note content must not contain base64 image payloads.
- Persisted Note images must carry a valid owned finalized `note-image` asset
  reference.
- Validation failures return `422 VALIDATION_ERROR`.

## Save And Image Rules

- Blurring the Note title field or editor saves the current draft when it is
  dirty.
- Switching pages with unsaved changes saves the current draft before the next
  page opens.
- Save failures keep the visible draft intact so the user can retry.
- Pasted or dropped Note images upload through the shared asset runtime before
  insertion into the editor.
- Persisted Note image markup stores the public image URL plus a durable
  `data-note-asset-id` reference.
- When a saved Note image disappears from the next saved Note content and no
  other active owned Note page still references that asset, the Note image
  asset is marked deleted for cleanup.

## Deferred Integration

- Note search, tags, sharing, templates, and file-picker uploads.
