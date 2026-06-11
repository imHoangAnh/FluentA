# Exec Plan

## Goal

Deliver the first usable, owner-scoped Journal vertical slice.

## Scope

In scope:

- Journal domain, application service, repository, API, migration, and tests.
- Protected `/journal` CRUD/list UI.
- Unicode content, optional learning date, and list previews.
- Product contract, decision, proof, Harness matrix, trace, and learning.

Out of scope:

- Tiptap, auto-save, search, calendar, and notifications.

## Risk Classification

Risk flags:

- Authorization and owner-scoped private data.
- Data model and migration.
- Public API contract.
- New user-visible workflow.
- Weak proof until live API/Postgres and E2E pass.

Hard gates:

- Authorization.

Lane: high-risk.

## Work Phases

1. Lock foundation contract and decision.
2. Implement domain/application/infrastructure/API.
3. Generate and apply migration.
4. Implement protected Journal UI and navigation.
5. Add focused unit, integration, and E2E proof.
6. Update durable Harness evidence.

## Stop Conditions

Pause if:

- Foundation requires claiming rich-text or search behavior.
- Ownership cannot match existing private-domain `404` behavior.
- Migration would alter existing domain data.
