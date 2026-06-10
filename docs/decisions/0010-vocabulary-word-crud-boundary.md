# Vocabulary Word CRUD Boundary

## Status

Accepted

## Context

The source specification couples word CRUD to flashcard synchronization, but
the current application has deck records only. Flashcard cards, review state,
review history, domain-event dispatch, and SignalR synchronization do not yet
exist.

## Decision

Implement authenticated vocabulary-word CRUD and the inline page table as
`US-VOCAB-002`. Preserve the specified default word fields, ownership rules,
and soft-delete behavior. Defer flashcard-card synchronization, review-history
deletion, SignalR, custom columns, and advanced spreadsheet keyboard behavior
to later vertical slices.

## Consequences

- Learners can maintain real vocabulary data immediately.
- The word API and database model become stable inputs to the flashcard slice.
- Creating, editing, or deleting a word does not yet change flashcard decks.
- The product contract must state this temporary boundary clearly.

## Superseded Boundary

The temporary no-synchronization consequence was superseded by
`US-FLASH-001` and decision `0011-transactional-card-sync-event-timing`.
