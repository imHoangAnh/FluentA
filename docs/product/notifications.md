# Notifications removal

The user approved removing Notifications from FluentA during the feature
migration on 2026-10-08. Reminders are also removed from the retained features.

- The sidebar has no inbox, notification bell or unread badge.
- The frontend has no Notifications page, API client or realtime subscriber.
  Old `/notifications` URLs follow the existing unknown-route fallback to `/`.
- The backend has no `/api/v1/notifications` endpoints, use cases, repository,
  domain entity, EF configuration or notification SignalR event. Removed API
  URLs return the existing not-found response.
- The current EF model and final fresh database do not contain `notifications`.
  Historical migrations remain until the final initial migration is rebuilt.
  `NotificationsRemoval` drops only that obsolete table; validate it against an
  isolated database. Do not apply it to an existing user database in this step.
- Pomodoro no longer requests browser notification permission or creates a
  browser notification. Its timer and shared SignalR runtime remain until
  Pomodoro's separate removal.
- Retained feature success/error messages and confirmations remain available.
