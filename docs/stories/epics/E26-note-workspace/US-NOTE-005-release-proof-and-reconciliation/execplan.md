# Exec Plan

## Goal

Finish Feature 25 by proving that Note Workspace behavior, docs, and Harness
records agree on the shipped first-release contract.

## Scope

In scope:

- focused Note browser proof
- Note backend and frontend regression confirmation
- Note product-doc drift fixes
- Harness matrix, validation, and trace updates
- small reconciliation fixes only if proof exposes a real contract gap

Out of scope:

- rename/delete Note UI
- search, tags, sharing, templates, or file-picker upload
- broad unrelated regression cleanup in the dirty worktree

## Risk Classification

Risk flags:

- cross-layer release proof
- user-visible persistence and autosave behavior
- shared asset lifecycle expectations
- dirty worktree around adjacent Note stories

Hard gates:

- do not widen the Note feature boundary
- do not revert unrelated dirty files
- do not close the story without focused browser proof or a documented validated
  replacement

## Work Steps

1. Inspect the shipped Note surface and existing e2e helpers.
2. Add or update a focused Note browser smoke.
3. Run targeted backend, frontend, build, and browser proof.
4. Fix only release-blocking Note gaps exposed by proof.
5. Reconcile product docs, validation evidence, matrix row, and workflow state.
6. Record final Harness trace.

## Stop Conditions

Pause for human confirmation if:

- browser proof requires a destructive local-data action outside isolated test
  fixtures
- release proof uncovers a gap that changes the locked Feature 25 contract
- runtime dependencies required for proof cannot be started in this environment
