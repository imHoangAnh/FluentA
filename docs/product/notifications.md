# Notifications

FluentA provides a durable, user-owned in-app notification inbox.

- Habit reminder and expired Countdown jobs create notifications exactly once.
- Users can list only their notifications, inspect unread count, mark one read,
  or mark all read.
- The sidebar Notification item sits immediately above Settings and opens a
  scrollable inbox preview to the right; its persistent "Show all notifications"
  action opens `/notifications`, the full inbox route.
- External email, push delivery, and preferences are deferred.
