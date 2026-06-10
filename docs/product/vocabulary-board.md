# Vocabulary Board

## Product Boundary

Vocabulary Board is the source of truth for FluentA language data. This
contract covers board management, page management, and vocabulary-word CRUD.
Column customization, TTS, real-time synchronization notifications, and
spaced-repetition review behavior are separate stories.

## User Outcomes

- A logged-in user can create boards with a name and target language.
- A logged-in user can see only their own boards.
- A logged-in user can update or soft-delete their own boards.
- A logged-in user can create, rename, reorder, and delete pages within their
  own boards.
- A logged-in user can select a page and create, edit, list, and soft-delete
  vocabulary words in an inline table.
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

- Creating a board creates one `All Words Deck` for that board.
- Creating a page creates one `Page Deck` named `[BoardName] - [PageName]`.
- Creating a word creates one card in its Page Deck and one card in the
  board's All Words Deck in the same database transaction.
- Updating a word synchronizes both cards' copied content without resetting
  scheduling metadata.
- Deleting a word hard-deletes both synchronized cards and all associated
  review history while the source word remains soft-deleted.
- Deleting a page or board also removes affected cards and review history.
- SignalR notification and the read-only Flashcards viewer are separate
  dependent stories.

## API Contract

All responses use the FluentA envelope.

| Method | Endpoint | Behavior |
| --- | --- | --- |
| `GET` | `/api/v1/boards` | List the current user's boards with page counts. |
| `POST` | `/api/v1/boards` | Create a board and its All Words deck. |
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

## Validation And Error Rules

- Board name is required and must be 1-120 characters.
- Board language is required and must be a 2-8 character language code.
- Page name is required and must be 1-120 characters.
- Word, Vietnamese meaning, English meaning, class, and example are required.
- Word class must be `noun`, `verb`, `adj`, `adv`, `phrase`, or `other`.
- Validation failures return `422 VALIDATION_ERROR`.
- Missing board/page/word ownership returns `404 VOCAB_NOT_FOUND`.
