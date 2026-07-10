# Design

## Domain Model

Add a new Note bounded context with at least:

- `NoteBoard` aggregate root
  - required owner `UserId`
  - trimmed `Name`
  - owned page collection
- `NotePage`
  - required parent `BoardId`
  - trimmed `Name`
  - durable `Content`
  - user-visible created-date metadata

Both entities use the repo's shared base-entity timestamps and soft-delete
fields. `NoteBoard` owns the first-release board delete lifecycle: when the
board is deleted, its active pages are soft-deleted with the same Note-owned
operation, matching locked decision `D2`.

## Application Flow

This story adds the backend seam later Note stories will build on:

- list active owned boards with lightweight page summaries
- create owned boards
- rename/update owned boards
- soft-delete owned boards
- create owned pages in owned active boards
- get one owned active page
- rename/update owned pages
- soft-delete owned pages

Application services must scope every query and mutation by authenticated user
and return Note-owned validation/not-found errors rather than leaking
cross-user existence.

## Interface Contract

The Note API surface should align to `SPEC.md` section 25:

- `GET /api/v1/notes/boards`
- `POST /api/v1/notes/boards`
- `PATCH /api/v1/notes/boards/{boardId}`
- `DELETE /api/v1/notes/boards/{boardId}`
- `POST /api/v1/notes/boards/{boardId}/pages`
- `GET /api/v1/notes/pages/{pageId}`
- `PATCH /api/v1/notes/pages/{pageId}`
- `DELETE /api/v1/notes/pages/{pageId}`

Responses use the FluentA API envelope. Missing, deleted, or foreign-user Note
resources return `404` through Note-owned error codes. Validation failures
return `422`.

## Data Model

Add durable Note tables, expected as:

- `note_boards`
  - `id`
  - `user_id`
  - `name`
  - `created_at`
  - `updated_at`
  - `deleted_at`
- `note_pages`
  - `id`
  - `board_id`
  - `name`
  - `content`
  - `date`
  - `created_at`
  - `updated_at`
  - `deleted_at`

Add ownership and query-shape indexes that support:

- active boards by user
- active pages by board
- active page get by id through owned board

The initial content model should be compatible with later sanitized HTML
persistence, but this story does not yet add image-reference tracking.

## UI / Platform Impact

No shipped frontend behavior changes in this story. The impact is structural:
later `/notes` workspace and editor stories will target the new backend Note
contract instead of mock or repurposed Journal/Vocabulary data.

## Observability

Validation evidence must capture:

- the durable schema shape
- owner-scoped board/page route behavior
- whether migration generation/build proof is fully runnable or constrained by
  unrelated dirty-worktree issues

## Alternatives Considered

1. Reuse Vocabulary board/page tables for Note.
   Rejected because Note pages are one rich-text document per page and need a
   separate bounded context.
2. Add the `/notes` UI first and postpone the backend contract.
   Rejected because later autosave and ownership behavior depend on real Note
   resources.
