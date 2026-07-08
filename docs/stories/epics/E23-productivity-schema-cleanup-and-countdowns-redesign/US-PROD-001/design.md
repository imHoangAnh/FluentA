# Design

## Domain Model

- Todo removes carry-over state as a business concept; task date becomes
  immutable after create and completion ordering relies on existing
  `completed_at`.
- Kanban cards keep `title`, `description`, `priority`, and `deadline` only;
  tags are removed from entity, DTO, validation, and filters.
- Journal entries rename `learningDate` to `date`, keep optional rich-text
  `content`, and no longer store/search derived plain-text preview content.

## Application Flow

- Todo day/week queries list original-date tasks only, ordered as incomplete
  `created_at desc` followed by completed `completed_at desc`.
- Todo updates stop accepting `date` and `sortOrder` mutations after create.
- Kanban board/detail responses stop returning tags, and client filtering uses
  only `priority` and `deadline`.
- Journal list/search/calendar/detail flows move to singular naming and
  title-only search while preserving autosave and calendar open/create
  behavior.

## Interface Contract

- Todo keeps `/api/v1/todos` endpoints but narrows writable fields to title,
  note, and completion.
- Kanban keeps the current board/card route family but removes tag request and
  response fields plus title-search UI behavior.
- Journal uses singular route/API naming where reasonable: `/journal` and
  `/api/v1/journal`.
- Validation errors remain `422 VALIDATION_ERROR`; ownership-miss behavior
  stays `404`.

## Data Model

- Remove Todo `is_carried_over`, `original_date`, and any sort-order dependence
  that existed only for reorder/move flows.
- Remove Kanban `tags` storage and related mapping.
- Rename `journal_entries` to `journal` and `learning_date` to `date` when the
  migration path allows a synchronized cutover.
- Remove `plain_text_content` durable storage and any derived preview/search
  index that exists only for content-search behavior.

## UI / Platform Impact

- Todo week view remains for view/create by day only; no drag-and-drop or
  cross-day move.
- Kanban cards display only title, priority, and deadline on the board; card
  description remains in form/detail.
- Journal list cards show only title and date; the TipTap toolbar expands to
  the approved heading/alignment/checklist controls and keeps default `Open
  Sans` at size `14` with non-persistent zoom.

## Observability

- Existing structured request and background-job logging remain in place.
- Static cleanup proof must scan for removed field names and legacy route names
  across backend, frontend, and tests.

## Alternatives Considered

1. Keep compatibility shims for old Journal plural routes and preview/content
   search while the frontend catches up.
   Rejected because the feature requires real cleanup rather than parallel
   contracts unless a migration-only bridge becomes temporarily necessary.
