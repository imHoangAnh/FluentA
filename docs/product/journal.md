# Journal

## Product Boundary

This contract covers the Journal Entry Foundation and rich-text autosave slices
as narrowed by Feature 22. It provides owner-scoped journal CRUD, newest-first
listing, sanitized rich-text content, title-only search, and a writing-date
calendar.

Learning-date open/create behavior prepares unsaved entries for empty dates;
automatic draft creation is deferred.

## Outcomes

- A logged-in user can open `/journal` from protected app navigation.
- A logged-in user can list only their own active journal entries, newest first.
- A logged-in user can create an entry with a required title, required writing
  date, and optional rich-text content.
- A logged-in user can open and edit an owned entry.
- Existing entries auto-save two seconds after the learner stops editing and
  show saving, saved, or failed status.
- New entries require explicit creation before autosave begins.
- A logged-in user can soft-delete an owned entry.
- Journal list cards show only title and writing date.
- Journal title and content support Unicode text.
- Journal content supports Heading 1-4, bold, italic, underline, highlight,
  bullet list, ordered list, task list, undo, redo, left/center/right/justify
  alignment, and a view-only zoom control.
- Journal HTML is sanitized on the server before persistence.
- A learner can search their active owned entries by title only.
- A learner can browse a month calendar showing which learning dates have
  active Journal entries.
- Clicking a populated calendar date opens the newest entry for that learning
  date.
- Clicking an empty calendar date prepares a new unsaved entry with that
  learning date.

## Ownership And Authorization Rules

- Every JournalEntry belongs to exactly one authenticated user.
- Missing, deleted, or foreign-user journal entries return `404
  JOURNAL_NOT_FOUND`.
- Deleted journal entries are excluded from list and get endpoints.

## API Contract

All responses use the FluentA envelope.

| Method | Endpoint | Behavior |
| --- | --- | --- |
| `GET` | `/api/v1/journal` | List active owned entries newest first. |
| `GET` | `/api/v1/journal/search?q=keyword` | Search active owned entry titles. |
| `GET` | `/api/v1/journal/calendar?month=YYYY-MM` | Return active owned writing dates and counts for one month. |
| `GET` | `/api/v1/journal/{id}` | Get one active owned entry. |
| `POST` | `/api/v1/journal` | Create an owned entry. |
| `PATCH` | `/api/v1/journal/{id}` | Field-scoped update for title, content, or date. |
| `DELETE` | `/api/v1/journal/{id}` | Soft-delete an owned entry. |

## Validation Rules

- Title is required and must be at most 240 characters after trimming.
- Content is optional sanitized HTML and must be at most 100,000 characters
  before sanitization.
- Writing date is required and must use `YYYY-MM-DD`.
- Validation failures return `422 VALIDATION_ERROR`.
- Search queries must contain 1-100 characters after trimming.
- Calendar month must use `YYYY-MM`.

## Deferred Integration

- Automatic draft creation for empty calendar dates.
