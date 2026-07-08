# Overview

## Current Behavior

Todo still supports carry-over, drag reorder, and cross-day moves backed by
`sortOrder`, `isCarriedOver`, and `originalDate`. Kanban still stores and
renders tags, title search, and tag filters. Journal still stores
`plain_text_content`, exposes `/api/v1/journals`, searches title and content,
and shows preview text on list cards.

## Target Behavior

Todo, Kanban, and Journal match the locked Feature 22 cleanup contract:

- Todo keeps day/week planning but removes carry-over, reorder, and move
  behavior.
- Kanban keeps board/card CRUD plus priority/deadline filtering, but removes
  tags and title search.
- Journal renames its singular durable/API/UI surface, removes preview/content
  search storage, keeps TipTap autosave, and requires a user-owned writing
  `date`.

## Affected Users

- Authenticated learners using Todo planning, Kanban boards, and Journal notes.

## Affected Product Docs

- `docs/product/personal-productivity.md`
- `docs/product/kanban.md`
- `docs/product/journal.md`

## Non-Goals

- Countdown cover upload and alert scheduling mechanics.
- Habit, Dashboard, Pomodoro, or learning-workflow redesign.
- Reintroducing removed fields through compatibility shims unless required only
  for a tightly bounded migration step.
