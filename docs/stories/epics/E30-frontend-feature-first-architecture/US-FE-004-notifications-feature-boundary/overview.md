# US-FE-004 Notifications Feature Boundary

## Status

Implemented and reviewed pending local commit.

## Contract

Move `/notifications`, its page, and its API adapter into
`features/notifications` without changing list, unread-count, mark-one, or
mark-all behavior.

## Acceptance Criteria

- `/notifications` is a protected lazy feature route.
- The inbox retains `['notifications']` and `['notifications-unread']` cache
  invalidation after read mutations.
- No Notifications route, page, or API remains in legacy paths.
- The public feature index is the supported Notifications import boundary.
