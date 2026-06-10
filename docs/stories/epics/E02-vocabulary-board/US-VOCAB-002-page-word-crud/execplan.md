# Exec Plan

## Goal

Implement authenticated vocabulary-word CRUD inside pages as a durable,
user-visible vertical slice.

## Scope

In scope:

- Word domain entity, persistence mapping, and migration.
- Authenticated word CRUD application and API behavior.
- Selected-page inline CRUD table.
- Unit, API-contract, frontend, and browser proof.

Out of scope:

- Flashcard synchronization and review history.
- SignalR.
- Custom columns.
- Advanced spreadsheet keyboard behavior.

## Risk Classification

Risk flags:

- Authorization.
- Data model.
- Public contracts.
- Existing behavior.
- Weak proof.
- Multi-domain.

Hard gates:

- Authorization.
- Data migration.

## Work Phases

1. Record Harness intake and story contract.
2. Implement domain, application, infrastructure, and API behavior.
3. Generate and inspect the database migration.
4. Implement the selected-page word table.
5. Validate backend and frontend behavior.
6. Update Harness proof and trace.

## Stop Conditions

Pause for human confirmation if:

- Word CRUD requires destructive changes to existing tables.
- Ownership cannot be enforced through existing board/page boundaries.
- Validation requirements need to be weakened.
