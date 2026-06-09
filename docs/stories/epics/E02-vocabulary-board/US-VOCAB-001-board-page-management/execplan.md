# Exec Plan

## Goal

Implement board management and page management as a durable authenticated
vertical slice.

## Scope

In scope:

- Domain entities for boards, pages, and minimal flashcard decks.
- EF Core mappings and migration.
- Authenticated board/page API.
- Protected React board/page management UI.
- Unit, API, browser, and migration validation.

Out of scope:

- Vocabulary words.
- Card generation and review scheduling.
- Custom columns and TTS.

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

1. Record Harness intake and story packet.
2. Implement domain/application/infrastructure/API slice.
3. Generate and apply migration.
4. Implement frontend API client and board workspace.
5. Validate with tests, API smoke, and browser smoke.
6. Update Harness proof and trace.

## Stop Conditions

Pause for human confirmation if:

- Existing auth persistence must be destructively changed.
- Board/page behavior conflicts with SPEC.md.
- Flashcard deck side effects require full card-generation behavior.
