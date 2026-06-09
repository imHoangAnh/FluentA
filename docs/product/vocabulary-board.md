# Vocabulary Board

## Product Boundary

Vocabulary Board is the source of truth for FluentA language data. This
contract covers board management and page management for the current slice.
Inline vocabulary entry, word edit/delete, column customization, TTS, and
spaced-repetition card behavior are separate stories.

## User Outcomes

- A logged-in user can create boards with a name and target language.
- A logged-in user can see only their own boards.
- A logged-in user can update or soft-delete their own boards.
- A logged-in user can create, rename, reorder, and delete pages within their
  own boards.
- The protected app shell shows board and page management as the primary
  workspace.

## Ownership And Authorization Rules

- Every board belongs to exactly one authenticated user.
- Pages are owned through their parent board.
- API calls for boards or pages outside the current user return `404` so the
  existence of another user's data is not revealed.
- Deleted boards and pages are hidden from normal list/detail endpoints.

## Flashcard Deck Sync Rules

- Creating a board creates one `All Words Deck` for that board.
- Creating a page creates one `Page Deck` named `[BoardName] - [PageName]`.
- This slice creates deck records only. Flashcard cards and review behavior are
  deferred until vocabulary-word management.

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

## Validation And Error Rules

- Board name is required and must be 1-120 characters.
- Board language is required and must be a 2-8 character language code.
- Page name is required and must be 1-120 characters.
- Validation failures return `422 VALIDATION_ERROR`.
- Missing board/page ownership returns `404 VOCAB_NOT_FOUND`.
