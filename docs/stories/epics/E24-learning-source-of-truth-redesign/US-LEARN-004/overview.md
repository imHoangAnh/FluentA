# US-LEARN-004 Overview

## Goal

Rebuild Review around board-level due queues, same-day resumable sessions,
overflow deferral, and Level 5 management so the Review experience matches the
Feature 23 target contract.

## Scope

- Board picker driven by due counts and active same-day session behavior.
- Review queue creation and continuation semantics on durable session items.
- Same-day resume modal with continue, replace, and cancel actions.
- `recapAfterAnswer` handling and summary reset behavior.
- Level 5 settings route and inactive management UI.

## Out Of Scope

- Review history UI.
- Broader release cleanup of stale identifiers and old routes.
