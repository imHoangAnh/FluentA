# US-POMO-003: Pomodoro Session History And Long Breaks

## Current Behavior

Work phases can be completed, but no durable session is recorded, no daily
count is available, and every completed work phase starts a short break.

## Target Behavior

Completing a work phase records an immutable completed session. The user's
completed-work count selects a long break at each configured interval, and the
Pomodoro page displays today's completed count.

## Affected Users

- Logged-in learners using Pomodoro.

## Affected Product Docs

- `docs/product/pomodoro.md`

## Non-Goals

- Automatic phase completion, task linking, notifications, stopwatch, and a
  browsable session-history page.
