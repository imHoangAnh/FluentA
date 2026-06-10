# Design

## Domain Model

Board-owned custom-column definitions declare a name and text or number type.
Word-owned custom values store typed content for one definition. Private
user/board preferences identify hidden optional and custom columns.

## Application Flow

Vocabulary services preserve the existing owner-scoped `404` behavior,
validate typed values, and delete a custom definition, its values, and matching
preferences atomically.

## Interface Contract

- `GET /api/v1/boards/{boardId}/columns`
- `POST /api/v1/boards/{boardId}/columns`
- `DELETE /api/v1/boards/{boardId}/columns/{columnId}`
- `PUT /api/v1/boards/{boardId}/column-visibility`
- Existing word create/list/update responses and requests include custom values.

## UI / Platform Impact

A column settings panel controls optional/custom visibility and custom-column
creation/deletion. Visible custom fields appear in every page's create and edit
rows and use the current explicit save workflow.
