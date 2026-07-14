# US-UI-007 Board And Page Context Actions

## Status

implemented

## Lane

normal

## Product Contract

Vocabulary and Notes Board/Page rows expose `Rename` and `Delete` through the
existing right-click context menu. Rename trims input, enforces the domain name
limit, keeps Vocabulary Board language unchanged, and updates the selected UI
without a page reload. Delete requires explicit confirmation and moves the UI
to a surviving Board/Page or the matching empty state.

No API route, database schema, or ownership rule changes are part of this
story. Notes uses its existing ownership-scoped PATCH and DELETE endpoints.

## Acceptance Criteria

- Vocabulary Board and Page context menus contain Rename and Delete actions.
- Each Vocabulary Board row shows its language beside the Page count instead
  of showing the selected Board language in the page header.
- Notes Board and Page context menus contain Rename and Delete actions.
- Rename cannot submit an empty, unchanged, or over-limit name.
- Delete confirmation identifies the exact target and Cancel leaves it intact.
- Successful mutations update React Query state and show entity-specific
  feedback.

## Validation

- Focused Vocabulary and Notes Vitest: 14/14 passed, covering rename and delete
  for both entity types plus per-Board language placement.
- Frontend lint, production build, and `git diff --check`: passed.
- The production build retains the existing third-party SignalR pure-comment
  warning; it does not fail the build and is unrelated to this story.
