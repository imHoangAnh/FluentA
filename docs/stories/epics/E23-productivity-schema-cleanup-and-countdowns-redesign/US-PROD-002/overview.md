# Overview

## Current Behavior

Countdown currently uses `/countdown`, supports create/edit/delete, stores one
UTC target date-time plus optional color/icon styling, and emits one completion
notification once `target_date <= now`.

## Target Behavior

Countdown becomes a create/delete-only `/countdowns` workflow backed by
date-based milestones, Vietnam-local multi-alert scheduling, and one optional
shared-asset cover image finalized during create. Cards prioritize the cover as
the visual treatment, completed countdowns remain visible for seven days, and
manual delete cancels only future unfired alerts.

## Affected Users

- Authenticated learners tracking exams, deadlines, and milestones with
  countdown reminders.

## Affected Product Docs

- `docs/product/personal-productivity.md`
- `docs/product/assets.md`

## Non-Goals

- Countdown edit, cover replacement, or cover removal.
- User-configurable countdown timezone support.
- Browser push notifications or external delivery channels.
