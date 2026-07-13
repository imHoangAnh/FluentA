# US-UI-006 Overview

## Status

implemented

## Lane

normal

## Product Contract

Compact the shared desktop AppShell and keep the Vocabulary rail, toolbar,
column header, and Word list stable within the remaining viewport. Long cell
content wraps and sizes its own editor without introducing inner scrollbars or
changing spreadsheet behavior.

## Relevant Product Docs

- `docs/product/vocabulary-board.md`
- `docs/decisions/0046-frontend-design-system-and-legacy-css-boundary.md`
- `docs/stories/epics/E28-vocabulary-workspace-polish/context.md`

## Acceptance Criteria

- AppShell header is approximately 56 px high and remains full width.
- Expanded Sidebar is 184 px; collapsed Sidebar remains 84 px.
- Desktop collapse/expand is an icon-only button beside the logo with an
  accessible name; at 1100 px or less the Sidebar stays 84 px and the button is
  hidden.
- The shell change applies to all AppShell routes without changing AuthShell.
- Vocabulary's Board/Page rail heading and create action stay fixed while only
  its tree scrolls.
- The page toolbar and table column header remain fixed while Word rows scroll
  vertically inside the available viewport.
- Toolbar content is exactly Page name plus disabled `Search`, `Filter`, and
  active `Setting Columns` controls in that order; Search/Filter communicate
  `Coming soon` accessibly.
- Every table column has the approved adaptive 1 px divider across header,
  Word rows, and new-Word row.
- Long content wraps with no inner control scrollbar; each editor sizes to its
  own content while the row still clears its tallest cell.
- Existing horizontal table scrolling, resize, reorder, autosave, Retry, Tab,
  Shift+Tab, Escape, Enter, and preference behavior remain intact.

## Non-Goals

- Search or Filter logic.
- Delete menus, confirmation, or toasts; those belong to `US-VOCAB-009`.
- AppShell mobile redesign, AuthShell changes, APIs, schemas, or domain logic.

## Validation Summary

- Component tests for AppShell state/breakpoint classes and Vocabulary toolbar,
  independent overflow owners, adaptive dividers, and cell autosizing.
- Existing VocabTable regression tests for autosave and keyboard behavior.
- Chromium desktop/tablet long-content and overflow proof.
- Focused lint, frontend test suite, and production build.
