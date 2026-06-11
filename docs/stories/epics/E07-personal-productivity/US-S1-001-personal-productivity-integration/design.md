# Design

## Domain Model

No domain model changes. Existing Todo completion remains the source event.

## Application Flow

1. A Todo completion update persists.
2. `TodoService` publishes `TodoItemChecked` after repository update.
3. `SignalRTodoSyncNotifier` sends to the authenticated user's SyncHub group.
4. Every authenticated SPA route owns an active Todo sync listener.
5. Receiving clients invalidate `todo` and future `dashboard` queries.

## Interface Contract

Reuse the existing `/hubs/sync` hub and `TodoItemChecked` message. No public
contract changes.

## Data Model

No table, index, migration, or retention changes.

## UI / Platform Impact

Authenticated browser tabs receive Todo completion invalidation even when they
are currently on Workspace, Countdown, Flashcards, settings, or review routes.

## Observability

Use focused Playwright to prove cross-tab visible refresh and existing request
logs to confirm successful Todo update requests.

## Alternatives Considered

1. Keep the listener only on Todo. Rejected because other authenticated routes
   and future Dashboard queries miss events while Todo is unmounted.
2. Add a second hub/event. Rejected because the existing authenticated SyncHub
   and event already express the required behavior.
