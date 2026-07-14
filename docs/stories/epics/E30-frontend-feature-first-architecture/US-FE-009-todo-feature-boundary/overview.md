# US-FE-009 — Todo feature boundary

Move `/todo`, day/week planning UI, Todo API/types, and Todo realtime
invalidation into `features/todo` without changing URLs, payloads, cache keys,
or Dashboard behavior.

## Acceptance criteria

- `/todo` comes from a lazy Todo feature route and is absent from the legacy manifest.
- API/types, page/week UI, and realtime hook have Todo ownership.
- `['todo']` invalidation retains `refetchType: 'all'`.
- Dashboard consumes Todo only through the feature public API.
