# Design

## Domain Model

No new domain model. This story verifies the final Feature 21 shape across the
backend and frontend slices.

## Application Flow

Run the locked Feature 21 verification ladder after US-VOCAB-006 and
US-VOCAB-007 land, then capture any fallout in docs, matrix rows, and trace
evidence.

## Interface Contract

Prove that only the fixed-column API surface remains live and that removed
custom-column endpoints/paths are absent.

## Data Model

Review the final migration script and, where possible, runtime schema evidence
for removed tables and the new board-preference row.

## UI / Platform Impact

Focused browser proof should cover:

- fixed-column table rendering
- hide/show nullable fields
- board-wide order reuse across pages
- width persistence
- horizontal scrolling

## Observability

Harness matrix rows, validation evidence, and final trace are the delivery
artifacts.

## Alternatives Considered

1. Treat backend and frontend story proofs as sufficient without a release pass.
   Rejected because Feature 21 crosses schema, API, and user-visible table
   behavior.
