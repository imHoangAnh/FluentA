# Exec Plan

## Goal

Implement Kanban card move cross-tab synchronization using the existing
authenticated SignalR hub.

## Scope

In scope:

- Product contract update.
- `IKanbanSyncNotifier`, null notifier, SignalR notifier, and DI registration.
- Post-persistence `KanbanCardMoved` publish from `MoveCardAsync`.
- Backend unit tests proving successful moves notify and rejected moves do not.
- Frontend `useKanbanSync` hook mounted at the authenticated boundary.
- Focused two-tab Playwright proof.

Out of scope:

- Card create/update/delete events.
- Multi-user collaboration.
- SignalR backplane.
- Pomodoro linking.

## Risk Classification

Risk flags:

- Public contract: adds a client-visible SignalR event.
- Authorization: event must stay scoped to the authenticated user group.
- Existing behavior: card move behavior remains durable and owner-scoped.
- Cross-platform: browser real-time behavior.

Hard gates:

- Authorization.

## Work Phases

1. Update product/story contract.
2. Add backend notifier interface, implementations, DI, and tests.
3. Add frontend hook and route-boundary mount.
4. Add focused two-tab E2E proof.
5. Run validation and record Harness evidence.

## Stop Conditions

Pause for human confirmation if:

- Sync requires changing authentication or group membership behavior.
- Durable Kanban move semantics need to change.
- Validation cannot prove two-tab behavior.
