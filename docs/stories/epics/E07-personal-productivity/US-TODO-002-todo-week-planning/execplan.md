# Exec Plan

## Goal

Complete desktop Todo planning with a seven-day Week view and durable
drag-and-drop reorder/date movement.

## Scope

- Day/Week segmented view control.
- Monday-Sunday week calculation and navigation.
- Range query for the selected week.
- Accessible desktop drag-and-drop using `@dnd-kit`.
- Field-scoped persistence of affected task `date` and `sortOrder`.
- Optimistic week cache update with rollback/refetch.
- Focused frontend/API/E2E proof.

## Risk Classification

Lane: `high-risk`

Risk areas:

- Existing persisted Todo behavior.
- Public client-visible workflow.
- Cross-day/order mutation correctness.
- New frontend interaction dependency.

## Stop Conditions

- Stop if the existing PATCH contract cannot persist stable sibling ordering.
- Stop if the DnD dependency cannot build or produce a reliable desktop proof.
- Stop if the implementation requires a schema migration or API contract change.
