# Exec Plan

## Goal

Replace the active Flashcard and Practice read paths with page-word
source-of-truth reads so Feature 23 starts from vocabulary ownership instead
of synchronized deck/card projections.

## Scope

In scope:

- Flashcard list/session backend queries and DTOs.
- Flashcard and Practice page-based frontend routes and API clients.
- Practice summary and Add-to-Review request shapes where they are page-scoped.
- Product docs and Harness artifacts needed to lock the new page-based slice.

Out of scope:

- Review state/session redesign.
- Practiced badge redesign and recap-time per-word Add to Review UX.
- Database removal of `flashcard_decks` and `flashcard_cards`.

## Risk Classification

Risk flags:

- Data model.
- Public contracts.
- Existing behavior.
- Weak proof.
- Multi-domain.

Hard gates:

- Source-of-truth hierarchy change.
- Public route and DTO contract change.

## Work Phases

1. Lock Feature 23 decision and story packet.
2. Cut Flashcard reads from deck/card tables to board/page/word ownership.
3. Convert page session APIs and frontend routes for Flashcard and Practice.
4. Re-key Practice persistence requests from `deckId` to `pageId`.
5. Run focused proof and update Harness status.

## Stop Conditions

Pause for human confirmation if:

- Review depends on a route/DTO shape not covered by the locked Feature 23
  contract.
- Practice persistence cannot move to page ownership without a migration in the
  same slice.
- Validation requirements need to be weakened.
