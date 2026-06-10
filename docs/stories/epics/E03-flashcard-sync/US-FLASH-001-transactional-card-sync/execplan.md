# Exec Plan

## Goal

Make vocabulary changes and synchronized card/review changes one atomic durable
operation.

## Scope

In scope:

- Domain events and card/review entities.
- EF mappings and migration.
- Transactional create/update/delete synchronization.
- Parent page/board deletion cleanup.
- Unit and PostgreSQL integration proof.

Out of scope:

- SignalR.
- Flashcard read API and viewer.
- Review and scheduling commands.

## Risk Classification

Risk flags:

- Authorization.
- Data model.
- Existing behavior.
- Weak proof.
- Multi-domain.

Hard gates:

- Data migration and destructive review-history deletion.

## Work Phases

1. Add domain model and events.
2. Add persistence mappings and synchronization behavior.
3. Generate/apply migration.
4. Prove create/update/delete atomicity and metadata preservation.
5. Update Harness evidence.

## Stop Conditions

Pause if:

- Card synchronization needs a second durable commit.
- Existing word ownership checks must be weakened.
- Review deletion cannot be proven without destructive unrelated data changes.
