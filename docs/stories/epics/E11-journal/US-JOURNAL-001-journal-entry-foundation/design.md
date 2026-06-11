# Design

## Domain Model

`JournalEntry` is an owner-scoped aggregate containing title, optional plain
content, derived preview text, optional normalized learning date, timestamps,
and soft deletion.

## Application Flow

`JournalService` validates boundary input, loads entries through an
owner-scoped repository, applies domain mutations, and maps entities to DTOs.
Foreign, missing, and deleted entries share `JOURNAL_NOT_FOUND`.

## Interface Contract

- `GET /api/v1/journals`
- `GET /api/v1/journals/{id}`
- `POST /api/v1/journals`
- `PATCH /api/v1/journals/{id}`
- `DELETE /api/v1/journals/{id}`
- Protected browser route `/journal`

## Data Model

Add `journal_entries` with indexes on `(user_id, created_at)` and
`(user_id, learning_date)`. Content and preview remain plain Unicode text.

## UI / Platform Impact

Add a responsive Journal list/editor page and Journal links from Dashboard and
top-level protected navigation.

## Observability

Existing authenticated request logging covers Journal API calls.

## Alternatives Considered

See `docs/decisions/0020-journal-foundation-boundary.md`.
