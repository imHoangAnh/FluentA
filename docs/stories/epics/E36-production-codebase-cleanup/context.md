# E36 Production Codebase Cleanup Context

## Status

Active implementation started 2026-08-09 after explicit user approval.

## Goal

Remove unreachable application code, unused dependencies, obsolete compatibility
paths, and retired schema elements while preserving every supported FluentA
route, feature, provider, and workflow. E36 is cleanup only; deployment work
remains in E34.

## Approved Decisions

- Clean frontend, backend, tests, dependencies, and schema aggressively, but
  preserve supported behavior.
- Local/dev data may be reset; no production data is in scope.
- Remove an endpoint, path, DTO, or test only after direct and indirect consumer
  proof.
- Keep valid production providers even when disabled locally.
- Update tests for supported workflows; delete tests only with the behavior they
  cover.
- Remove unused npm/NuGet packages; do not perform broad upgrades.
- Require zero first-party warnings; third-party warnings must be verified and
  documented.
- Replace the current EF migration chain with one baseline after the final model
  is known and prove an empty local/dev database can apply it.
- Preserve historical story, decision, validation, and review documents.

## Preserved Contracts

- Existing routes, menus, feature workflows, API envelopes, supported providers,
  recurring jobs, and user-visible behavior remain available.
- E34 remains the separate production deployment initiative.

## Recovery Boundary

Work is grouped by US-CLEAN story. The database reset is local/dev only and is
performed only after the exact connection target and empty-data condition are
verified. Existing E33 history remains available as the prior baseline recovery
reference.
