# Design

## Domain Model

`VocabWord` belongs to one `VocabPage` and stores the default vocabulary
columns: word, Vietnamese meaning, English meaning, class, example, thesaurus,
collocation, and note. Updates replace editable content. Deletes are soft.

## Application Flow

`VocabularyService` validates word requests and resolves ownership through the
current user's board before creating, listing, updating, or deleting words.

## Interface Contract

- `GET /api/v1/boards/{boardId}/pages/{pageId}/words`
- `POST /api/v1/boards/{boardId}/pages/{pageId}/words`
- `PATCH /api/v1/boards/{boardId}/words/{wordId}`
- `DELETE /api/v1/boards/{boardId}/words/{wordId}`

All routes require authentication and use the existing FluentA envelope.
Missing or foreign-owned records return `404 VOCAB_NOT_FOUND`.

## Data Model

Add `vocab_words` with a required page foreign key, required default fields,
nullable supplementary fields, timestamps, and an index on
`(page_id, created_at)`.

## UI / Platform Impact

The workspace page list becomes selectable. The selected page shows an inline
word-create row and editable word rows with save and confirmed delete actions.

## Observability

Existing canonical request logging covers word CRUD API calls.

## Alternatives Considered

1. Include flashcard synchronization in this slice. Rejected because card and
   review-history models do not exist yet and would turn CRUD into a second
   independent subsystem.
