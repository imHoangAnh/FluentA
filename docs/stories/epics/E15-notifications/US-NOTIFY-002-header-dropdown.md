# US-NOTIFY-002 Notification Dropdown

## Status

implemented

## Lane

normal

## Product Contract

The sidebar Notification item immediately above Settings opens a dropdown
preview of the authenticated user's inbox. The list scrolls when it exceeds
the dropdown height, and a fixed bottom action routes to `/notifications` for
the full inbox.

## Relevant Product Docs

- `docs/product/notifications.md`

## Acceptance Criteria

- Selecting Notification opens the inbox preview instead of immediately
  navigating.
- The preview handles loading, error, empty, read, and unread items using the
  existing notification list query.
- A long list is contained in a scrollable region.
- "Show all notifications" remains visible at the bottom and routes to
  `/notifications`.

## Design Notes

- API: Reuse the existing owner-scoped `GET /notifications` response and its
  `['notifications']` query cache; no API, persistence, or read-state change.
- UI surfaces: Feature-owned `NotificationsMenu` is composed by the app
  provider, while shared `AppShell` places it above Settings and passes the
  sidebar collapsed state.

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

- `npm --prefix src/frontend run test -- src/test/app/app-shell.test.tsx src/test/vocabulary/WorkspacePage.test.tsx src/features/notes/pages/NotesPage.test.tsx`: passed (15/15), including the headerless shell and Notification-before-Settings order.
- `npm --prefix src/frontend run test:e2e -- e2e/notifications-inbox.spec.js`: passed (4/4), including the long-preview scroll and footer route proof.
- `npm --prefix src/frontend run lint`: passed.
- `npm --prefix src/frontend run build`: passed; retained the established non-fatal SignalR/Rolldown dependency warnings.
- `git diff --check`: passed.
