# Vocabulary Board

## Product Boundary

Vocabulary Board is the source of truth for FluentA language data. This
contract covers board management, page management, vocabulary-word CRUD,
board-wide column customization, and board-language semantic labels. TTS and
spaced-repetition review behavior are separate stories.

## User Outcomes

- A logged-in user can create boards with a name and target language.
- A logged-in user can see only their own boards.
- A logged-in user can update or soft-delete their own boards.
- A logged-in user can create, rename, reorder, and delete pages within their
  own boards.
- A logged-in user can select a page and create, edit, list, and soft-delete
  vocabulary words in an inline table.
- A logged-in user can add board-wide text and number custom columns, edit
  typed custom values on every page, and permanently delete custom columns and
  their values.
- A logged-in user's hidden optional/custom columns are private per board.
- Existing vocabulary cells autosave independently on blur or Tab. Failed
  autosaves preserve the draft and show inline Retry.
- Tab and Shift+Tab traverse visible editable cells, Escape cancels the current
  cell draft, and Enter at the final visible cell moves into the persistent
  blank row for continued entry.
- Board language adapts semantic vocabulary labels. Chinese boards label the
  existing secondary meaning field as Pinyin while keeping the same durable
  `meaningEn` storage slot.
- The protected app shell shows board and page management as the primary
  workspace.

## Ownership And Authorization Rules

- Every board belongs to exactly one authenticated user.
- Pages are owned through their parent board.
- Words are owned through their parent page and board.
- API calls for boards or pages outside the current user return `404` so the
  existence of another user's data is not revealed.
- Deleted boards, pages, and words are hidden from normal list/detail
  endpoints.

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
- SignalR notification and the read-only Flashcards viewer are separate
  dependent stories.

## API Contract

All responses use the FluentA envelope.

| Method | Endpoint | Behavior |
| --- | --- | --- |
| `GET` | `/api/v1/boards` | List the current user's boards with page counts. |
| `POST` | `/api/v1/boards` | Create a board. |
| `GET` | `/api/v1/boards/{boardId}` | Get one board with pages. |
| `PATCH` | `/api/v1/boards/{boardId}` | Update board name, language, or sort order. |
| `DELETE` | `/api/v1/boards/{boardId}` | Soft-delete a board. |
| `GET` | `/api/v1/boards/{boardId}/pages` | List pages for one board. |
| `POST` | `/api/v1/boards/{boardId}/pages` | Create a page and its Page deck. |
| `PATCH` | `/api/v1/boards/{boardId}/pages/{pageId}` | Rename or reorder a page. |
| `DELETE` | `/api/v1/boards/{boardId}/pages/{pageId}` | Soft-delete a page. |
| `GET` | `/api/v1/boards/{boardId}/pages/{pageId}/words` | List active words in a page. |
| `POST` | `/api/v1/boards/{boardId}/pages/{pageId}/words` | Create a word in a page. |
| `PATCH` | `/api/v1/boards/{boardId}/words/{wordId}` | Update a word owned through the board. |
| `DELETE` | `/api/v1/boards/{boardId}/words/{wordId}` | Soft-delete a word owned through the board. |
| `GET` | `/api/v1/boards/{boardId}/columns` | Get board custom columns and the current user's hidden column keys. |
| `POST` | `/api/v1/boards/{boardId}/columns` | Create a board-wide text or number custom column. |
| `DELETE` | `/api/v1/boards/{boardId}/columns/{columnId}` | Permanently delete a custom column and all values. |
| `PUT` | `/api/v1/boards/{boardId}/column-visibility` | Replace the current user's hidden optional/custom columns for the board. |
| `PATCH` | `/api/v1/boards/{boardId}/words/{wordId}/cells` | Validate and update one owned fixed or custom vocabulary cell. |

## Validation And Error Rules

- Board name is required and must be 1-120 characters.
- Board language is required and must be a 2-8 character language code.
- Page name is required and must be 1-120 characters.
- Word, Vietnamese meaning, secondary meaning, class, and example are required.
- Word class must be `noun`, `verb`, `adj`, `adv`, `phrase`, or `other`.
- Validation failures return `422 VALIDATION_ERROR`.
- Missing board/page/word ownership returns `404 VOCAB_NOT_FOUND`.
- Custom-column names are required, unique per board ignoring case, and at
  most 120 characters.
- Custom text values are at most 4000 characters; number values must parse as
  invariant decimal values.

## Column Configuration Rules

- Thesaurus, Collocation, and Note are optional fixed columns and may be hidden.
- Required fixed columns remain visible.
- Custom definitions are shared across every page in their board.
- Visibility preferences are private to the current user and board.
- Deleting a custom column permanently removes its typed values and matching
  visibility preferences in the same database commit.
- Custom values remain vocabulary-only and are not copied into flashcard
  review content.

## Spreadsheet Editing Rules

- Cell updates load current durable word state and persist only the named
  fixed/custom cell.
- Unrelated cells may save concurrently without overwriting one another.
- Fixed-cell updates synchronize only the corresponding flashcard content
  while preserving scheduling metadata.
- Successful client saves merge only the confirmed cell into cached words.
- Same-cell saves are serialized; the newest queued draft wins.
- Failed drafts remain visible with inline Retry and are never automatically
  reverted.
- Delete and Add actions are outside spreadsheet Tab traversal.

## Multi-language Rules

- Board language is stored as a 2-8 character code.
- Known frontend language profiles are `en`, `zh`, `ja`, `ko`, and `fr`.
- Chinese (`zh`) boards display the secondary meaning field as Pinyin in the
  spreadsheet and blank-row entry flow.
- Unknown language codes keep the default secondary label and remain editable.
