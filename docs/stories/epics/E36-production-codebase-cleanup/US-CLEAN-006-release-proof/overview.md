# US-CLEAN-006 Final Release Proof

## Goal

Complete the remaining dependency/config cleanup and produce the evidence-backed
handoff from E36 to E34.

## Acceptance Criteria

1. Remaining direct npm/NuGet dependencies, config keys, jobs, DI registrations,
   and exports are audited and unused items are removed.
2. Security/dependency checks are run; broad upgrades are not introduced.
3. Backend, frontend, E2E, schema, OpenAPI, runtime-log, and diff checks pass.
4. Any verified third-party warning is explicitly recorded with its risk status.
5. E36 validation and execution plan contain the final result and limitations.
