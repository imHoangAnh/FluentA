# 0029 Pomodoro Task Link Ownership

Date: 2026-06-12

## Status

Accepted

## Decision

Pomodoro validates optional Todo and Kanban links through their existing
owner-scoped repositories before starting. Redis carries the validated link,
and completed Work sessions preserve it.

## Consequences

Foreign, deleted, and missing tasks are indistinguishable and rejected.
