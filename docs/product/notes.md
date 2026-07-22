# Notes

## Product Boundary

This contract covers the shipped first-release Note Workspace behavior for
Feature 25. FluentA provides an authenticated `/notes` surface with owner-scoped
boards and pages, Vocabulary-aligned modal and context-menu management,
Journal-style rich-text editing, blur and page-switch save behavior, pasted or
dropped Note image upload through the shared asset runtime, and feature-owned
Note-image references.

Search, tags, sharing, templates, file-picker uploads, attachment libraries,
and cross-feature linking remain out of scope.

## Outcomes

- A logged-in user can enter `/notes` from the protected app navigation.
- A logged-in user can list only their own active Note boards.
- A logged-in user can right-click a Note Board or Page to rename or delete
  that exact item with accessible dialogs, destructive confirmation,
  entity-specific success feedback, and sensible focus restoration when the
  former trigger disappears.
- A logged-in user can create a Note board and create a Note page inside it
  through focused modal dialogs; creation never expands an inline form inside
  the workspace.
- New Note pages open immediately with blank content.
- A logged-in user can get and update one owned active Note page.
- Note Workspace uses the same board-and-page rail pattern as Vocabulary. A
  selected page header shows its editable title and date on the left, the
  complete existing formatting toolbar in the middle, and save state/actions
  on the right. The zones wrap when space is constrained, while every toolbar
  command remains available and the whole page does not overflow horizontally.
- Editor content starts directly below the selected-page header. The editable
  document canvas has no visible border or whole-canvas focus ring in idle or
  focused state; caret and keyboard editing remain available. Word and
  character counters are not displayed.
- Note page edits show save-state feedback, save on blur, and save before a
  page switch completes.
- A user can paste or drop an image file into a Note page.
- Saved Note content renders uploaded images after reload without storing base64
  image payloads.
- Removing an embedded Note image and then saving immediately detaches the
  Note-page ownership reference; the shared asset lifecycle archives it later.
- Deleting a Note board soft-deletes its active Note pages in the same first
  release lifecycle.

## Ownership And Authorization Rules

- Every Note board belongs to exactly one authenticated user.
- Every Note page belongs to exactly one active Note board owned by the same
  user.
- Every pasted or dropped Note image must be an owned finalized shared
  `note-image` asset.
- A Note page can own many Note images, while a Note image can be attached to
  only one active Note page through `note_page_assets`.
- A Note-page read authorizes the page first, then hydrates short-lived signed
  image URLs for its current ready image references.
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
- Persisted Note images must carry a valid owned ready `note-image` asset
  reference in `data-note-asset-id`; their `src` attribute is removed before
  persistence.
- Validation failures return `422 VALIDATION_ERROR`.

## Save And Image Rules

- Blurring the Note title field or editor saves the current draft when it is
  dirty.
- Switching pages with unsaved changes saves the current draft before the next
  page opens.
- Save failures keep the visible draft intact so the user can retry.
- Pasted or dropped Note images upload through the shared asset runtime before
  insertion into the editor.
- Persisted Note image markup stores only the durable
  `data-note-asset-id` reference. It never stores a public, provider, or
  signed URL.
- When a saved Note image disappears from the next saved Note content, its
  `note_page_assets` association is removed and its ready asset is archived in
  the same save. Archived objects are purged asynchronously after 30 days.

## Workspace Interaction Rules

- Create Board asks only for the board name. Create Page asks only for the page
  name and clearly identifies the selected destination board.
- Create, Rename, and Delete dialogs return focus to the initiating control
  when it still exists. Successful deletion returns focus to the Notes rail
  because the deleted Board or Page trigger no longer exists.
- Rename and Delete remain available from Board/Page right-click menus; no
  always-visible destructive button is added to the rail.
- Notes reuses the same `JournalRichTextEditor` toolbar commands through an
  optional placement host. Journal keeps its existing inline toolbar by
  default.
- The responsive Notes workspace stacks its rail above the editor when the
  available width is narrow, then returns to a two-column rail/editor layout
  at wider widths.

## Deferred Integration

- Note search, tags, sharing, templates, and file-picker uploads.
