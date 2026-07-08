# US-LEARN-005 Overview

## Goal

Close the learning source-of-truth redesign by reconciling migrations, routes,
settings navigation, and stale learning identifiers so the shipped codebase no
longer points back to the retired deck/card ownership model.

## Scope

- Focused proof for backend/frontend builds and learning tests after the
  source-of-truth cutover.
- Cleanup of stale route assumptions in active learning E2E coverage.
- Story and verification artifacts for the Feature 23 release-reconciliation
  slice.

## Out Of Scope

- Rewriting historical docs that intentionally describe superseded releases.
- Broad deletion of legacy domain artifacts outside the active Feature 23
  delivery surface.
