# Design

## Domain Model

No aggregate change. Calendar reads the existing optional
`JournalEntry.LearningDate`.

## Application Flow

The service validates a `YYYY-MM` month, asks the repository for active owned
entries grouped by learning date in that month, and returns `{ date, count }`
rows. The browser renders a month grid and uses existing list data to open the
newest entry for a populated date.

## Interface Contract

- `GET /api/v1/journals/calendar?month=YYYY-MM`
- Invalid or missing month returns `422 VALIDATION_ERROR`.
- Response rows contain `date` in `YYYY-MM-DD` and `count`.

## Data Model

No migration. The existing `(user_id, learning_date)` index supports calendar
month lookups.

## UI / Platform Impact

Add previous/next month controls and a calendar grid in the Journal list panel.
Dot/count indicators mark days with active entries. Empty-date clicks prepare a
new entry with a default learning-date title and selected learning date.

## Observability

Existing authenticated request logging covers calendar requests.

## Alternatives Considered

1. Auto-create a blank Journal entry on empty-date click. Rejected to preserve
   the US-JOURNAL-002 explicit-create rule.
2. Open a date modal listing all entries. Deferred because the first calendar
   slice can use the existing entry list and editor.

