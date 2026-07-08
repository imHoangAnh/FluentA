# Exec Plan

## Goal

Introduce the durable Review session/state ownership model required by Feature
23 so later review UX can resume, replace, and finish same-day board sessions
on top of real persisted queue membership.

## Scope

In scope:

- New Review session entities and EF configurations.
- Review repository/session creation and submit logic updates.
- Migration for `review_sessions` and `review_session_items`.
- Backend DTO updates needed to expose session lifecycle data.
- Story/decision/product-doc updates needed to lock the ownership shift.

Out of scope:

- Final frontend continue/replace modal.
- Level 5 management UI.
- Practice redesign.

## Risk Classification

Risk flags:

- Data model.
- Public contracts.
- Existing behavior.
- Weak proof.
- Multi-domain.

Hard gates:

- Source-of-truth hierarchy change.
- Durable session ownership and queue mutation.

## Work Phases

1. Lock the `US-LEARN-002` story packet.
2. Add Review session domain entities and persistence configuration.
3. Update Review repository logic to create and track durable sessions/items.
4. Expose lifecycle-aware backend DTOs while keeping the current route family.
5. Run focused backend proof, then decide whether a thin frontend adaptation is
   needed inside this slice or can wait for `US-LEARN-004`.

## Stop Conditions

Pause for human confirmation if:

- The session lifecycle needs frontend modal behavior immediately to keep
  Review usable.
- Existing review history cannot safely coexist with persisted session items.
- Validation requirements need to be weakened.
