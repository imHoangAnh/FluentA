# Exec Plan

## Goal

Ship the frontend half of Feature 21 so the vocabulary workspace matches the
new fixed-column backend contract and persists board-wide preferences through
the API.

## Scope

In scope:

- Frontend API type updates for fixed fields and board preferences.
- Workspace table/settings rewrite for fixed columns only.
- Board-wide hide/show, order, width, and horizontal overflow behavior.
- Focused frontend tests and build proof.

Out of scope:

- Backend migration changes beyond any small compile fixes discovered here.
- Final release regression.

## Risk Classification

Risk flags:

- Public contracts
- Existing behavior
- Weak proof
- Cross-platform

Hard gates:

- none beyond the backend contract dependency

## Work Phases

1. Switch frontend to the US-VOCAB-006 API contract.
2. Remove custom-column UI and local-storage-only preference ownership.
3. Add board-wide hide/order/width persistence and overflow behavior.
4. Run focused frontend validation.
5. Update Harness evidence.

## Stop Conditions

Pause for human confirmation if:

- the backend contract still needs incompatible changes after US-VOCAB-006
- browser interaction proof reveals a bigger UX redesign than Feature 21 asks for
