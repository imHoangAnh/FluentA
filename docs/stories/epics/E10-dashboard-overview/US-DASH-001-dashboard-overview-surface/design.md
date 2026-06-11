# Design

## Domain Model

No new domain entities. Dashboard reads current user-owned data from existing
Todo, Habit, Countdown, and Flashcard contracts.

## Application Flow

The frontend Dashboard page resolves the browser timezone and today's local
date, then runs existing TanStack Query calls:

- `todoApi.listByDate(today)`
- `habitApi.listHabits(timeZoneId)`
- `countdownApi.listCountdowns()`
- `flashcardApi.getDashboard(timeZoneId)`
- `flashcardApi.listDecks()`

Todo and Habit checkbox actions call the existing mutation APIs and invalidate
their domain query families plus `['dashboard']`.

## Interface Contract

- `/` renders the Dashboard Overview for authenticated learners.
- `/vocabulary` renders the existing vocabulary workspace.
- Dashboard widgets link to existing feature routes:
  - `/flashcards`
  - `/todo`
  - `/habits`
  - `/countdown`
  - `/vocabulary`

## Data Model

No migration. Dashboard data is derived from existing read endpoints and
client-side sorting/filtering.

## UI / Platform Impact

Dashboard is a protected route with responsive widget cards. It keeps quick
links visible for existing productivity flows and uses inline Todo/Habit
checkboxes for quick completion.

## Observability

Existing API request logging covers the underlying domain calls. No new
dashboard-specific logging is added.

## Alternatives Considered

1. Implement `/api/v1/dashboard/overview` first. Deferred because existing
   domain APIs already expose the needed MVP dashboard data and this story can
   validate the user-facing surface without a new backend read model.
2. Keep vocabulary as `/`. Rejected because SPEC1 says Dashboard is the
   default page after login; `/vocabulary` preserves the existing workspace.
