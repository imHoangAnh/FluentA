# Overview

## Current Behavior

Journal entries can store an optional learning date, but learners cannot browse
or start notes from a calendar.

## Target Behavior

Authenticated learners see a month calendar in Journal. Dates with Journal
entries show indicators. Clicking a populated date opens the newest entry for
that learning date; clicking an empty date prepares a new unsaved entry for
that date.

## Affected Users

- Authenticated FluentA learners.

## Affected Product Docs

- `docs/product/journal.md`

## Non-Goals

- Creating drafts automatically on date click.
- Showing all entries for a date in a modal.
- Calendar synchronization events.

