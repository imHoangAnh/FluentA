# Overview

## Current Behavior

Settings is already split into shared-shell routes for Profile, Practice,
Review, and Level 5, and Profile/Practice/Review already use explicit saves.
The remaining gap is release-proof: Level 5 still needs focused regression
coverage inside the shared shell, and the docs/evidence need final
reconciliation to the shipped split-route contract.

## Target Behavior

FluentA proves that `/settings/level5` preserves its existing global Level 5
management semantics inside the shared Settings shell, and the feature docs and
Harness evidence reflect the final split-route truth for all four settings
surfaces.

## Affected Users

- Authenticated learners using Level 5 management in Settings.

## Affected Product Docs

- `docs/product/authentication.md`
- `docs/product/learning-workflows.md`

## Non-Goals

- New Level 5 features or API changes.
- Additional settings fields.
- Mobile settings navigation.
