# Transactional Card Sync Event Timing

## Status

Accepted

## Context

Vocabulary changes must synchronize flashcards atomically and also notify
connected clients. The specification illustrates dispatching all domain events
after `SaveChanges`, but durable card handlers running after commit would
require a second transaction and could leave vocabulary and cards inconsistent.

## Decision

Vocabulary entities raise domain events as synchronization intent. Durable card
creation, content synchronization, and deletion are consumed and staged before
the vocabulary repository's single `SaveChangesAsync` call. SignalR
notifications are dispatched only after that commit succeeds.

## Consequences

- Vocabulary and synchronized cards succeed or fail together.
- Clients are never notified about rolled-back card state.
- Durable synchronization handlers and post-commit notification handlers have
  intentionally different timing.
- A future durable asynchronous event pipeline would require an outbox or
  equivalent design.
