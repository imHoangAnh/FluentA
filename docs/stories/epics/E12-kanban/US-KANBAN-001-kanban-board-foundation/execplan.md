# Exec Plan

## Goal

Implement the first complete Project Management Kanban Board vertical slice.

## Scope

In scope:

- Product contract and high-risk story packet.
- Domain entities and EF migration for boards, columns, cards, and tags.
- Owner-scoped API for board, column, card, move, and delete behavior.
- React API client, protected route, navigation, page UI, styles, and filters.
- Unit and browser proof for default columns, owner isolation, blocked column
  delete, card update/move, filters, and explicit create/delete flows.

Out of scope:

- SignalR `KanbanCardMoved`.
- Pomodoro linking.
- Rich-text editor for card descriptions.
- Dashboard Kanban widget.

## Risk Classification

Risk flags:

- Data model.
- Public contracts.
- Authorization and owner-scoped access.
- Existing protected navigation behavior.
- Weak proof because the Kanban domain is new.

Hard gates:

- Authorization and data model.

## Work Phases

1. Create product/story/decision records.
2. Implement backend domain, service, repository, controller, migration, and
   unit tests.
3. Implement frontend route, API client, page, styles, and app test coverage.
4. Add focused Playwright proof.
5. Run backend, frontend, migration, and E2E validation.
6. Record durable Harness evidence and trace.

## Stop Conditions

Pause for human confirmation if:

- Kanban behavior requires changing shared auth or tenant boundaries.
- EF migration would require destructive changes to existing data.
- Validation commands cannot run and no equivalent proof is available.
