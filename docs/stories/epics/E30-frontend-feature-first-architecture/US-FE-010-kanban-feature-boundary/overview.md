# US-FE-010 — Kanban feature boundary

Move `/kanban`, board/column/card UI, API/types, and realtime invalidation into
`features/kanban` without changing URLs, payloads, cache keys, or Pomodoro
behavior.

## Acceptance criteria

- `/kanban` is lazy-composed by the Kanban feature and absent from the legacy manifest.
- Kanban UI, API/types, and realtime hook have Kanban ownership.
- `['kanban']` realtime invalidation preserves `refetchType: 'all'`.
- Pomodoro uses Kanban only through the public feature API.
