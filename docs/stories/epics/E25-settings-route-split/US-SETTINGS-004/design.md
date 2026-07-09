# Design

## Domain Model

- No backend or persistence change is required in this story.
- Existing Level 5 API contracts remain unchanged.

## Application Flow

- `LevelFiveSettingsPage.tsx` continues to own the in-shell Level 5 management
  behavior.
- Focused tests should prove filter selection, search narrowing, single remove,
  and bulk remove behavior against mocked Level 5 data.
- Existing split-route tests remain part of the release-proof baseline.

## Interface Contract

- `/settings/level5` remains inside the shared Settings shell/sidebar.
- Level 5 remains global, not board-scoped.
- `All`, `Active`, and `Inactive` filters remain available.
- Search still filters by word text.
- Remove actions still mark items inactive rather than redesigning state
  transitions.

## Data Model

- No migration is required.
- No DTO or endpoint contract changes are required.

## UI / Platform Impact

- No intentional UI redesign is required.
- Doc wording and proof artifacts become the main deliverables in this slice.

## Observability

- No new logging or metrics are required.
- Focused frontend tests and any feasible browser proof are the evidence
  surfaces.

## Alternatives Considered

1. Skip dedicated Level 5 coverage and rely on route-render tests only.
   Rejected because Feature 24 explicitly calls for Level 5 regression proof.
2. Expand this story into a Level 5 UI redesign.
   Rejected because locked decision D9 preserves existing Level 5 behavior.
