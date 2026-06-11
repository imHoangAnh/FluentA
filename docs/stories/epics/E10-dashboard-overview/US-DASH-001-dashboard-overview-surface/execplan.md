# Exec Plan

## Goal

Deliver the first SPEC1 Dashboard Overview as the default authenticated home
surface.

## Scope

In scope:

- Protected Dashboard route at `/`.
- Vocabulary workspace route at `/vocabulary`.
- Dashboard widgets for flashcards, streak, Todo, Habits, and Countdown.
- Inline Todo and Habit quick toggles.
- Navigation updates, focused tests, and Playwright proof.
- Product docs, story evidence, Harness matrix, and trace.

Out of scope:

- New dashboard aggregation API.
- Widget visibility settings.
- Dashboard-specific backend persistence.
- Scheduled jobs, reminders, alerts, or notification delivery.

## Risk Classification

Risk flags:

- Multi-domain: Dashboard reads Todo, Habit, Countdown, and Flashcard data.
- Existing behavior: `/` changes from vocabulary workspace to dashboard.
- Public contracts: authenticated navigation and visible home behavior change.
- Weak proof until route tests and browser smoke cover the new default page.

Hard gates:

- None.

Lane: high-risk.

## Work Phases

1. Record intake/story and create story packet.
2. Implement Dashboard page from existing API clients.
3. Move vocabulary workspace to `/vocabulary` and update links.
4. Update route/component tests.
5. Add focused Playwright dashboard smoke.
6. Run validation and update Harness evidence.

## Stop Conditions

Pause if:

- Existing vocabulary workflows cannot remain reachable.
- Dashboard needs new backend schema or authorization rules.
- Acceptance requires weakening prior Todo/Habit/Flashcard proof.
