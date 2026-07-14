# US-FE-004 Validation

## Baseline

`notifications-inbox.spec.js` passed 3/3 before the move, covering unread,
pending, mark-one, mark-all, error, responsive, empty, and owner-scope states.
The legacy manifest Vitest baseline passed 1/1.

## Required Final Proof

- Focused route-manifest test and Notifications Playwright suite.
- Lint, complete Vitest, production build, structural scans, and diff check.
- Harness story verification and review evidence before the local commit.

## Final Evidence

| Requirement | Evidence | Result |
| --- | --- | --- |
| Feature-owned lazy route | `app/router.tsx` composes `notificationsRoutes`; `app/legacy-routes.tsx` no longer contains Notifications. | PASS |
| Inbox behavior unchanged | Existing Playwright suite passed unread, pending, mark-one, mark-all, error, responsive, empty, and owner-scope cases. | PASS |
| Cache contract preserved | The moved page retains `['notifications']` and `['notifications-unread']` invalidation after both mutations. | PASS |
| Legacy and deep paths removed | Static scans found no `routes/notifications`, `lib/api/notification.api`, or Notifications feature deep import. | PASS |
| Platform proof | Focused Vitest, full Vitest 58/58, lint, production build, E2E 5/5, and `git diff --check` passed. | PASS |

No P1, P2, or P3 findings. No backend, API payload, schema, realtime, or
product/UI behavior changed. Production build retains only the established
non-fatal SignalR/Rolldown annotation warnings.
