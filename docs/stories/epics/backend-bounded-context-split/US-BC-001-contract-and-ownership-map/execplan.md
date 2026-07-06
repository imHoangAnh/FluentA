# Exec Plan

## Goal

Produce the current-to-target contract and ownership map that later Feature 20
implementation stories will follow.

## Scope

In scope:

- Inspect backend API, application, domain, infrastructure, EF, migrations, and
  dependency injection paths.
- Inspect frontend API clients, settings/dashboard usage, Vitest references,
  and Playwright endpoint references.
- Inspect Vocabulary sync and cleanup paths.
- Register concrete target owners for each endpoint, type, method, table, and
  test surface.
- Record migration posture and production/user-data guardrails.
- Record implementation order and proof obligations for later stories.

Out of scope:

- Runtime source-code moves.
- Controller endpoint changes.
- Repository or EF refactors.
- Frontend endpoint cutover.
- Test rewrites.
- New migrations.

## Risk Classification

Risk flags:

- Public API contract.
- Data model/migration planning.
- Existing behavior.
- Cross-context ownership.
- Frontend/backend cutover.
- Weak proof if mapping is incomplete.

Lane: high-risk.

## Work Phases

1. Inventory backend endpoints and controller actions.
2. Inventory application services, ports, repository methods, and DTOs.
3. Inventory domain entities, value objects, and scheduler types.
4. Inventory EF `DbSet` properties, configurations, tables, indexes, and
   migration impact.
5. Inventory frontend API/test endpoint usage.
6. Inventory Vocabulary sync/cleanup coupling.
7. Write `contract-map.md` with target owner and later story assignment.
8. Run static scans that prove no major current surface was missed.
9. Register Harness evidence and update Agent Workflow state.

## Stop Conditions

Pause for human confirmation if:

- the current map reveals a required behavior change not covered by Feature 20
  locked decisions
- production/user-data migration becomes required now instead of dev reset
- Vocabulary sync cannot preserve atomic behavior without an outbox/broker
- target endpoint names conflict with current frontend route assumptions
- the map would require changing Practice/SRS/random-mode semantics
