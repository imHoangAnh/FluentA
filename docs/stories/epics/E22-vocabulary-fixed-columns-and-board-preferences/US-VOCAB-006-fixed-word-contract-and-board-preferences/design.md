# Design

## Domain Model

`VocabWord` changes from the E05 shape:

- required: `Word`, `MeaningVn`, `IpaPronunciation`, `Class`, `Example`
- nullable: `Definition`, `Note`, `Synonyms`, `Antonyms`

`ipaPronunciation` remains a plain text field. Leading/trailing slash
characters are user content and must survive validation, persistence, reads,
and cell-scoped edits unchanged.

`VocabBoardPreference` becomes a new user-owned, board-scoped entity storing:

- `HiddenColumns`
- `ColumnOrder`
- `ColumnWidths`

Exactly one active preference row is allowed per `(userId, boardId)`.

## Application Flow

Board detail reads must include the current user's board preferences so the
workspace can reuse them across page changes. Preference writes upsert the
single `(userId, boardId)` row after validating:

- only nullable fixed columns may be hidden
- column order covers each fixed key exactly once
- widths are keyed by fixed columns only

Word create, full update, and cell-scoped update continue to use owner-scoped
`404` behavior and preserve Flashcard synchronization. Review cleanup stays
unchanged because Review already owns SRS state/history.

## Interface Contract

Add:

- board detail preference payload on `GET /api/v1/boards/{boardId}`
- `PUT /api/v1/boards/{boardId}/preferences`

Remove:

- `GET /api/v1/boards/{boardId}/columns`
- `POST /api/v1/boards/{boardId}/columns`
- `DELETE /api/v1/boards/{boardId}/columns/{columnId}`
- `PUT /api/v1/boards/{boardId}/column-visibility`

Word create/update DTOs and cell keys change to the fixed Feature 21 names.
Planning keeps API casing aligned with current FluentA DTO style.

## Data Model

`vocab_words`:

- rename/replace `meaning_en` with `ipa_pronunciation`
- add nullable `definition`, `synonyms`, and `antonyms`
- remove `thesaurus` and `collocation`
- confirm legacy Vocabulary-owned SRS columns are absent and stay absent

Drop:

- `vocab_custom_columns`
- `vocab_custom_values`
- `vocab_column_visibility`

Add:

- `vocab_board_preferences`
- unique index on `(user_id, board_id)`

Migration mapping:

- `meaning_en` content becomes `ipa_pronunciation`
- `thesaurus` content becomes `synonyms`
- `collocation` content becomes `definition` only when that is the accepted
  replacement; otherwise the migration must document why the content is dropped

## UI / Platform Impact

No frontend behavior is completed in this story, but the backend contract must
be shaped so the next story can:

- hide/show nullable fixed columns
- persist board-wide order and widths
- stop using browser-only order persistence

## Observability

No new logs or audit records. Validation, migration review, and focused tests
are the proof surface.

## Alternatives Considered

1. Keep compatibility DTOs and old endpoints during the cutover.
   Rejected because Feature 21 explicitly removes custom-column behavior rather
   than versioning it forward.
