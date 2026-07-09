# Exec Plan

## Goal

Cut split Practice and Review routes over from autosave to route-local drafts
with explicit save actions, while preserving the existing profile explicit-save
behavior and the shared Settings shell.

## Scope

In scope:

- Practice route draft-only toggle and reorder behavior until save.
- Review route draft-only field edits until save.
- Save button, success, and error feedback for Practice and Review.
- Focused tests and docs updates required for the explicit-save contract.

Out of scope:

- Route shell or sidebar redesign.
- Level 5 behavior changes.
- Backend API changes.
- Mobile settings navigation.

## Risk Classification

Risk flags:

- Existing behavior.
- Weak proof.

Hard gates:

- None beyond focused route-level proof and build verification.

## Work Phases

1. Convert Practice route interactions from autosave to draft-only edits.
2. Convert Review route interactions from autosave to draft-only edits.
3. Add focused proof for no-autosave, save success, and save failure behavior.
4. Refresh story evidence, docs, and Harness records.

## Stop Conditions

Pause for human confirmation if:

- Practice or Review requires a backend contract change to support explicit
  save.
- The route-local draft model conflicts with the already-shipped shared shell.
- Validation can no longer prove the no-autosave contract at the route level.
