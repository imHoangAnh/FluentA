# US-NOTIFY-002 Header Notification Dropdown

## Status

implemented

## Lane

normal

## Product Contract

The AppShell notification bell opens a dropdown preview of the authenticated
user's inbox. The list scrolls when it exceeds the dropdown height, and a
fixed bottom action routes to `/notifications` for the full inbox.

## Relevant Product Docs

- `docs/product/notifications.md`

## Acceptance Criteria

- Selecting the bell opens the inbox preview instead of immediately navigating.
- The preview handles loading, error, empty, read, and unread items using the
  existing notification list query.
- A long list is contained in a scrollable region.
- "Show all notifications" remains visible at the bottom and routes to
  `/notifications`.

## Design Notes

- API: Reuse the existing owner-scoped `GET /notifications` response and its
  `['notifications']` query cache; no API, persistence, or read-state change.
- UI surfaces: Feature-owned `NotificationsMenu` is composed by the app
  provider, while shared `AppShell` receives it as a neutral slot.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Focused AppShell and menu render checks. |
| Integration | Not applicable; no backend change. |
| E2E | Bell opens preview, scroll container is bounded, footer routes to inbox. |
| Platform | Frontend lint, build, and diff check. |
| Release | Not required. |

## Harness Delta

None.

## Evidence

- `npm --prefix src/frontend run test:run -- src/test/app/app-shell.test.tsx`: passed (1/1).
- `npm --prefix src/frontend run test:e2e -- e2e/notifications-inbox.spec.js`: passed (4/4), including the long-preview scroll and footer route proof.
- `npm --prefix src/frontend run lint`: passed.
- `npm --prefix src/frontend run build`: passed; retained the established non-fatal SignalR/Rolldown dependency warnings.
- `git diff --check`: passed.
