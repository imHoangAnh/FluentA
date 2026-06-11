# Journal

## Product Boundary

This contract covers the Journal Entry Foundation from SPEC1. It provides
owner-scoped journal CRUD, newest-first listing, plain-text previews, Unicode
content, and an optional learning date.

Rich-text editing, two-second auto-save, full-text search with highlighting,
calendar indicators, and learning-date open-or-create behavior are separate
follow-up stories.

## Outcomes

- A logged-in user can open `/journal` from protected app navigation.
- A logged-in user can list only their own active journal entries, newest first.
- A logged-in user can create an entry with a required title, optional content,
  and optional learning date.
- A logged-in user can open and edit an owned entry.
- A logged-in user can soft-delete an owned entry.
- Journal list cards show the title, creation date, optional learning date, and
  a plain-text preview limited to approximately 100 characters.
- Journal title and content support Unicode text.

## Ownership And Authorization Rules

- Every JournalEntry belongs to exactly one authenticated user.
- Missing, deleted, or foreign-user journal entries return `404
  JOURNAL_NOT_FOUND`.
- Deleted journal entries are excluded from list and get endpoints.

## API Contract

All responses use the FluentA envelope.

| Method | Endpoint | Behavior |
| --- | --- | --- |
| `GET` | `/api/v1/journals` | List active owned entries newest first. |
| `GET` | `/api/v1/journals/{id}` | Get one active owned entry. |
| `POST` | `/api/v1/journals` | Create an owned entry. |
| `PATCH` | `/api/v1/journals/{id}` | Field-scoped update for title, content, or learning date. |
| `DELETE` | `/api/v1/journals/{id}` | Soft-delete an owned entry. |

## Validation Rules

- Title is required and must be at most 240 characters after trimming.
- Content is optional and must be at most 100,000 characters.
- Learning date is optional and must use `YYYY-MM-DD`.
- Validation failures return `422 VALIDATION_ERROR`.

## Deferred Integration

- Tiptap HTML content and formatting controls.
- Two-second debounced auto-save and saved/saving state.
- Full-text search and keyword highlighting.
- Calendar month indicators and date-based open-or-create behavior.
