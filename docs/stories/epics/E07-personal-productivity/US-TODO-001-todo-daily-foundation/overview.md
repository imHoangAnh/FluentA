# Overview

## Current Behavior

FluentA has no Todo List feature. Authenticated learners can manage vocabulary
and flashcards, but they cannot create dated personal tasks, toggle completion,
or see incomplete tasks carried forward.

## Target Behavior

Authenticated learners can open `/todo`, view a selected day that defaults to
today, create tasks inline, toggle completion, update or delete tasks, navigate
between days, and see incomplete past tasks carried over to today with a
visible carried-over indicator.

## Affected Users

- Authenticated learners using FluentA for daily study planning.

## Affected Product Docs

- `docs/product/personal-productivity.md`

## Non-Goals

- Week view.
- Desktop drag-and-drop reorder or move between days.
- Countdown.
- Dashboard aggregation.
- Scheduled background jobs.
- Mobile drag-and-drop.
