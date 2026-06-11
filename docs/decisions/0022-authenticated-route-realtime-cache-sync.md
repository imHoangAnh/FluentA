# Authenticated Route Real-Time Cache Sync

Date: 2026-06-11

## Status

Accepted

## Context

Todo completion events were user-scoped and post-persistence, but the frontend
listener existed only on the Todo page. An authenticated tab viewing Countdown,
Flashcards, settings, or Workspace could miss the event, leaving cached Todo
and future Dashboard data stale until another explicit refresh.

## Decision

Mount user-scoped product synchronization listeners at the shared authenticated
route boundary when their cache effects apply across protected routes. For
`TodoItemChecked`, invalidate and refetch all cached Todo and future Dashboard
queries so inactive route caches are refreshed while another route is visible.

## Alternatives Considered

1. Keep the listener on Todo only. Rejected because events are missed whenever
   Todo is unmounted.
2. Add a new hub or Todo event. Rejected because the existing authenticated
   SyncHub and `TodoItemChecked` contract already express the behavior.
3. Mark inactive queries stale without refetching. Rejected because cross-route
   synchronization would not become observable until a later navigation.

## Consequences

Positive:

- Every authenticated route receives user-scoped Todo completion events.
- Cached Todo data refreshes before the user returns to Todo.
- The same boundary can host future authenticated product sync listeners.

Tradeoffs:

- Protected route transitions recreate the listener connection.
- Completion events may refetch multiple cached Todo ranges.

## Follow-Up

- Consider a persistent authenticated app shell if route-transition connection
  churn becomes measurable.
- Add future Dashboard queries under the documented invalidation key.
