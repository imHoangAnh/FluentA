# Vocabulary Board

## Product Boundary

Vocabulary Board is the source of truth for FluentA vocabulary content. The
current shipped contract uses a fixed spreadsheet-like word table plus
board-wide table preferences per user. Review-owned SRS behavior stays outside
this document.

## User Outcomes

- A logged-in user can create boards with a name and target language.
- The create-board form requires the user to choose a supported target language.
- A logged-in user can see only their own boards.
- A logged-in user can update or soft-delete their own boards.
- A logged-in user can create, rename, and delete pages within their own
  boards.
- A logged-in user can select a page and create, edit, list, and soft-delete
  vocabulary words in an inline table.
- A logged-in user can hide or show nullable fixed columns per board.
- A logged-in user can reorder fixed columns per board.
- A logged-in user can resize fixed columns per board.
- Board preferences apply to every page in the same board for that user.
- Existing vocabulary cells autosave independently on blur or Tab. Failed
  autosaves preserve the draft and show inline Retry.
- Tab and Shift+Tab traverse visible editable cells, Escape cancels the current
  cell draft, and Enter at the final visible cell moves into the persistent
  blank row for continued entry.
- Wide tables scroll horizontally instead of compressing content into unusable
  widths.
- Board and page lists show the newest created item first. Their order is not
  manually configurable.

## Ownership And Authorization Rules

- Every board belongs to exactly one authenticated user.
- Pages are owned through their parent board.
- Words are owned through their parent page and board.
- Board preferences are owned by the current `(user, board)` pair.
- API calls for boards, pages, words, or preferences outside the current user
  return `404`.
- Deleted boards, pages, and words are hidden from normal list/detail
  endpoints.

## Fixed Word Contract

Every vocabulary row uses these persisted fields:

- required: `word`, `meaningVn`, `ipaPronunciation`, `class`, `example`
- nullable: `definition`, `note`, `synonyms`, `antonyms`

`ipaPronunciation` is plain text. Leading or trailing slash characters are user
content and must round-trip unchanged.

## Flashcard Deck Sync Rules

- Creating a page creates one `Page Deck` named `[BoardName] - [PageName]`.
- Creating a word creates one card in its Page Deck in the same database
  transaction.
- Updating a word synchronizes that page-deck card's copied content without
  resetting learning metadata.
- Deleting a word hard-deletes the synchronized page-deck card, its review
  history, and any dedicated review-state row while the source word remains
  soft-deleted.
- Deleting a page or board also removes affected cards and review history.
- No `All Words` deck is created anywhere in the current product model.

## API Contract

All responses use the FluentA envelope.

| Method | Endpoint | Behavior |
| --- | --- | --- |
| `GET` | `/api/v1/boards` | List the current user's boards with page counts. |
| `POST` | `/api/v1/boards` | Create a board. |
| `GET` | `/api/v1/boards/{boardId}` | Get one board with pages plus the current user's board preferences. |
| `PATCH` | `/api/v1/boards/{boardId}` | Update board name or language. |
| `DELETE` | `/api/v1/boards/{boardId}` | Soft-delete a board. |
| `GET` | `/api/v1/boards/{boardId}/pages` | List pages for one board. |
| `POST` | `/api/v1/boards/{boardId}/pages` | Create a page and its Page deck. |
| `PATCH` | `/api/v1/boards/{boardId}/pages/{pageId}` | Rename a page. |
| `DELETE` | `/api/v1/boards/{boardId}/pages/{pageId}` | Soft-delete a page. |
| `GET` | `/api/v1/boards/{boardId}/pages/{pageId}/words` | List active words in a page. |
| `POST` | `/api/v1/boards/{boardId}/pages/{pageId}/words` | Create a word in a page. |
| `PATCH` | `/api/v1/boards/{boardId}/words/{wordId}` | Update a word owned through the board. |
| `PATCH` | `/api/v1/boards/{boardId}/words/{wordId}/cells` | Validate and update one owned fixed vocabulary cell. |
| `DELETE` | `/api/v1/boards/{boardId}/words/{wordId}` | Soft-delete a word owned through the board. |
| `PUT` | `/api/v1/boards/{boardId}/preferences` | Replace the current user's hidden columns, column order, and column widths for the board. |

## Validation And Error Rules

- Board name is required and must be 1-120 characters.
- Board language is required and must be a 2-8 character language code.
- Page name is required and must be 1-120 characters.
- Word, Vietnamese meaning, IPA pronunciation, class, and example are required.
- `definition` and `note` are at most 4000 characters.
- `synonyms` and `antonyms` are at most 2000 characters.
- Word class must be `noun`, `verb`, `adj`, `adv`, `phrase`, or `other`.
- Validation failures return `422 VALIDATION_ERROR`.
- Missing board/page/word ownership returns `404 VOCAB_NOT_FOUND`.

## Board Preference Rules

- Only nullable fixed columns may be hidden.
- Required fixed columns always stay visible.
- Column order must contain each fixed column exactly once.
- Column widths are saved by fixed column key.
- Preference rows are private to the current user and reused across every page
  in the board.
- If no preference row exists, the frontend uses the default fixed order and
  widths until the user customizes the table.

## Board And Page Ordering

- `vocab_boards` and `vocab_pages` do not persist a `sort_order` field.
- Board and page reads use `created_at` descending with `id` descending as the
  deterministic tie-breaker.
- Vocabulary table column order is independent and remains stored in the
  board preference row.

## Spreadsheet Editing Rules

- Cell updates load current durable word state and persist only the named fixed
  cell.
- Unrelated cells may save concurrently without overwriting one another.
- Fixed-cell updates synchronize only the corresponding flashcard content while
  preserving scheduling metadata.
- Successful client saves merge only the confirmed cell into cached words.
- Same-cell saves are serialized; the newest queued draft wins.
- Failed drafts remain visible with inline Retry and are never automatically
  reverted.
- Delete and Add actions are outside spreadsheet Tab traversal.
