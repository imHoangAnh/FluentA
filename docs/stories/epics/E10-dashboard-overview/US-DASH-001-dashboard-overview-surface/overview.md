# Overview

## Current Behavior

After login, FluentA opens the vocabulary workspace at `/`. Todo, Countdown,
Habit, and Flashcard features each have protected pages and API clients, but
there is no single home screen that summarizes today's work.

## Target Behavior

After login, authenticated learners land on a Dashboard Overview at `/`. The
dashboard greets the learner, shows flashcard due/streak information, today's
Todo tasks, today's Habits, and the nearest Countdown events. The previous
vocabulary workspace remains available at `/vocabulary`.

## Affected Users

- Authenticated FluentA learners.

## Affected Product Docs

- `docs/product/personal-productivity.md`
- `docs/product/flashcards.md`

## Non-Goals

- New database schema.
- New `/api/v1/dashboard/overview` backend aggregation endpoint.
- Widget visibility settings.
- Reminder, alert, or scheduled job behavior.
