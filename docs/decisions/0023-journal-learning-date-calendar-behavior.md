# 0023 Journal Learning Date Calendar Behavior

Date: 2026-06-12

## Status

Accepted

## Context

SPEC1 says clicking a date opens or creates the Journal entry for that learning
day. US-JOURNAL-002 intentionally avoided automatic draft creation until draft
lifecycle behavior is defined.

## Decision

Clicking a calendar date with active entries opens the newest owned entry for
that learning date. Clicking a date without entries prepares a new unsaved entry
with the selected learning date and a default title. Persistence still requires
the learner to click Create.

## Alternatives Considered

1. Auto-create a row on empty-date click. Rejected because it would create
   abandoned drafts and contradict the explicit-create autosave boundary.
2. Require a modal before opening or creating. Deferred because it adds workflow
   complexity without changing the core calendar contract.

## Consequences

- Calendar date clicks are useful immediately.
- Empty date exploration does not create private records.
- Multiple entries per learning date remain allowed; the newest opens first.

## Follow-Up

- Consider a date detail modal if users create multiple entries per day often.

