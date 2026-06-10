# Validation

## Proof Strategy

Prove exactly two cards are created per word, copied content updates without
resetting scheduling metadata, and word/page/board deletion removes affected
cards and reviews while preserving the intended soft-delete behavior.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | Card creation defaults, content sync preservation, word domain events |
| Integration | Two-card creation, uniqueness, update preservation, review/card deletion |
| E2E | Deferred to SignalR/viewer stories |
| Platform | Migration applies to local PostgreSQL |
| Performance | Durable sync timing recorded; full visible-under-3s proof deferred to viewer |
| Logs/Audit | Existing word request logs remain free of card content dumps |

## Fixtures

- One user, board, and page with existing All Words and Page decks.
- Word `mitigate`.
- Two cards with non-default scheduling metadata and seeded review records.

## Commands

```text
dotnet test src/backend/FluentA.slnx
dotnet tool run dotnet-ef database update --project FluentA.Infrastructure --startup-project FluentA.API
```

## Acceptance Evidence

- `dotnet test src/backend/FluentA.slnx` passed 19 tests.
- `AddFlashcardSynchronization` migration applied to local PostgreSQL.
- Migration backfilled one existing active word to exactly two cards with zero
  malformed card counts.
- Authenticated API/database smoke created exactly two cards for a new word in
  about `35 ms`.
- After scheduling metadata and two review rows were seeded, word update
  synchronized both cards' content and preserved metadata on both cards.
- Word deletion left the word soft-deleted and removed both cards and reviews.
- Page and board deletion each removed affected cards and reviews with zero
  orphan review rows.
