# Design

## Domain Model

No new frontend-only domain model. The UI consumes the fixed `Word` and
`BoardPreference` API contracts produced by US-VOCAB-006.

## Application Flow

Workspace board detail is the source for:

- board language
- page list
- board preferences

The table updates board preferences through the new backend preference endpoint
instead of browser-only local storage. Cell autosave stays keyed to fixed field
names only.

## Interface Contract

Use:

- board detail preference payload
- `PUT /api/v1/boards/{boardId}/preferences`
- fixed-field word CRUD/cell APIs

Remove client use of:

- custom-column list/create/delete endpoints
- column-visibility endpoint

## Data Model

No frontend-local durable model beyond TanStack Query cache state. Browser
local storage should no longer own column order.

## UI / Platform Impact

- Render fixed required columns always visible.
- Allow only `definition`, `note`, `synonyms`, and `antonyms` to hide/show.
- Persist drag order and widths board-wide.
- Keep autosave, keyboard traversal, Retry, and end-row blank entry behavior.
- Ensure the table uses horizontal scrolling rather than compressing inputs too
  far on smaller viewports.

## Observability

No new logs. Focused component tests and Playwright cover interaction proof.

## Alternatives Considered

1. Keep local-storage order as a fallback source of truth.
   Rejected because Feature 21 explicitly moves table preferences to
   per-user/per-board backend persistence.
