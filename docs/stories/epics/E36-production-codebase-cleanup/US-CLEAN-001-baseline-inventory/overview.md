# US-CLEAN-001 Baseline Inventory And Gates

## Goal

Create the evidence-backed inventory and deterministic validation baseline needed
to remove code safely.

## Acceptance Criteria

1. Routes, features, providers, jobs, config keys, packages, exports, endpoints,
   and model candidates have an owner and consumer status.
2. The two first-party hook warnings and the stale Profile heading assertion are
   resolved without changing supported behavior.
3. Frontend tests have a documented deterministic command and any parallel-only
   flakiness is isolated.
4. Backend Release build and frontend lint/type/test/build baseline commands are
   recorded with their actual result.

## Out Of Scope

Deleting candidates belongs to later stories.
