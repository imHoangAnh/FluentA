# Exec Plan

## Goal

Complete the SPEC1 S1 integration pass by making Todo completion sync active
throughout the authenticated SPA and recording consolidated regression proof.

## Scope

In scope:

- Move Todo sync ownership to the protected app boundary.
- Remove the Todo-page-local duplicate listener.
- Add focused cross-tab and route-navigation proof.
- Refresh personal-productivity product/story/Harness evidence.

Out of scope:

- Dashboard implementation.
- Countdown real-time events.
- API/schema changes.

## Risk Classification

Risk flags:

- Existing behavior.
- Multi-domain integration.
- Public client-visible synchronization behavior.
- Weak current cross-tab proof.

Hard gates:

- Do not change auth, ownership, API, or event contracts.
- Do not weaken existing validation.

## Work Phases

1. Validate current event and route wiring.
2. Move listener ownership.
3. Add focused integration proof.
4. Run regression ladder.
5. Update Harness evidence and review.

## Stop Conditions

Pause if the existing sync hub cannot support the global listener, if a new
event/API contract appears necessary, or if regression proof exposes a P1.
