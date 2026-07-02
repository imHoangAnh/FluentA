# Design

## Domain Model

`VocabBoard` is an aggregate owned by `UserId`. It has `Name`, `Language`, and
soft-delete metadata inherited from `BaseEntity`. Workspace board lists now
sort by `CreatedAt`.

`VocabPage` belongs to a board and stores `Name`. Board detail and page lists
now sort by `CreatedAt`.

`FlashcardDeck` is introduced as a minimal record so board/page creation can
satisfy the spec's deck side effects. It stores board id, optional page id,
name, type, and user id.

## Application Flow

`VocabularyService` owns command/query behavior. It validates user input,
enforces board ownership via repository methods scoped by `userId`, and creates
or updates domain objects. Board and page creation happen in one database save
with the corresponding deck record.

## Interface Contract

The protected API exposes `/api/v1/boards` and nested page routes. Controllers
extract the authenticated user id from JWT claims and return FluentA envelopes.
Board and page APIs no longer accept or return explicit reorder fields; clients
render both lists in `CreatedAt` order.

Errors:

- `422 VALIDATION_ERROR`
- `404 VOCAB_NOT_FOUND`

## Data Model

PostgreSQL tables:

- `vocab_boards`
- `vocab_pages`
- `flashcard_decks`

Indexes support user-scoped board lists, board-scoped page lists, and one deck
per board/page source.

## UI / Platform Impact

The protected root route renders a board management workspace with:

- board sidebar and create form
- board name/language editing
- page list and create form
- page rename/delete controls

The UI uses React Query for request deduplication and invalidation.

## Observability

Existing request logging covers API calls. Story validation records API and
browser smoke evidence.

## Alternatives Considered

1. Defer FlashcardDeck until the flashcard story. Rejected because the spec
   explicitly requires deck creation as a side effect of board/page creation.
2. Build vocabulary word editing in the same slice. Rejected to keep this
   story reviewable and focused on board/page management.
