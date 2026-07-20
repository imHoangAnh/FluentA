# US-PRACTICE-002 Overview

## Status

implemented

## Lane

normal with stronger route, responsive, and workflow validation

## Product Contract

Provide one full-width, Board-grouped Page Deck library for Flashcards and
Practice. Practice selection opens a refresh-stable preparation dialog and its
single Start action enters an active session at `/practice/:pageId` with the
selected order encoded in the URL.

## Relevant Product Docs

- `docs/product/flashcards.md`
- `docs/product/learning-workflows.md`
- `docs/stories/epics/E29-flashcard-practice-library/context.md`
- `docs/stories/epics/E04-review-sessions/US-PRACTICE-001-practice-modes.md`

## Acceptance Criteria

- Protected Practice navigation uses `/practice`; `/flashcards/practice` is no
  longer registered and reaches the current wildcard fallback.
- Active sessions use `/practice/:pageId`;
  `/flashcards/pages/:pageId/practice` is no longer registered and reaches the
  current wildcard fallback.
- Flashcards and Practice libraries use the available AppShell content width,
  render no duplicate inner page heading, and show multiple independently
  collapsible Boards.
- Each Board header contains only its name, `deck/decks` count, divider, and
  expansion icon; `Vocabulary board` is absent.
- Page Decks use the same compact centered presentation in Flashcards and
  Practice and render 10/7/2/1 per row at wide desktop/tablet/mobile/very-small
  widths. Each shows only Page name and word count; `Vocabulary page`,
  description, badges, and separate buttons are absent.
- An enabled Flashcards Page Deck card opens its existing viewer. An enabled
  Practice Page Deck card opens the preparation dialog. A zero-word card shows
  `0 words`, remains visible, and activates neither destination.
- The Practice dialog defaults to Sequential on every opening, permits
  Shuffle, and shows existing configured modes as ordered name badges only.
- `/practice?deck=:pageId` opens the exact valid non-empty deck dialog after
  data loads; refresh preserves it. Close/Cancel removes the query. Invalid,
  missing, or zero-word targets do not open an actionable dialog.
- `Start Practice` navigates directly to
  `/practice/:pageId?order=sequential|shuffle` and active Practice begins once
  cards and settings are ready without a second setup or Start action.
- Refresh preserves Shuffle/Sequential. Missing or invalid order normalizes to
  Sequential. Shuffle is applied once per route entry and does not change on a
  normal rerender.
- Existing viewer, active exercises, summaries, speech, Finish, Add to Review,
  SRS, ownership, API, and persistence behavior remain unchanged.

## Non-Goals

- Legacy Practice redirects, backend/API/schema changes, per-session mode
  editing, last-order persistence, Board expansion persistence, viewer or
  active-exercise redesign, or Practice Settings changes.

## Validation Summary

- Component tests for shared card actions, disabled empty deck, query-driven
  dialog lifecycle, order reset/normalization, loading/error behavior, and
  one-time Shuffle initialization.
- Route-manifest and navigation tests for new routes and removed legacy routes.
- Focused Chromium proof for external Practice links, refresh, dialog keyboard
  behavior, direct session start, and the shared responsive 10/7/2/1 compact
  grid.
- Existing Practice workflow regression proof to retain summary/Add to Review/
  no-SRS-mutation behavior.
- Frontend lint, full unit suite, production build, targeted legacy-reference
  search, and `git diff --check`.
