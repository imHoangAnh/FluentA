# Overview

## Current Behavior

FluentA has no Countdown feature. Authenticated learners can manage Todo tasks,
vocabulary, and flashcards, but they cannot track important dated events with a
live countdown.

## Target Behavior

Authenticated learners can open `/countdown`, list their own countdown events,
create events with name and target date/time, optionally set color and icon, edit
events, delete events with confirmation, and see cards sorted by nearest target
date with live remaining time or completed state.

## Affected Users

- Authenticated learners planning exams, homework deadlines, project milestones,
  and other important dates.

## Affected Product Docs

- `docs/product/personal-productivity.md`

## Non-Goals

- Dashboard aggregation.
- Countdown alert jobs.
- Browser notifications.
- Habit, Journal, Kanban, Pomodoro.
