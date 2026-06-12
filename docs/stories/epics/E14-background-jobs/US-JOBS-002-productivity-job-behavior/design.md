# Design

Jobs query active records directly through `AppDbContext`. Habit reminders and
countdown alerts persist idempotency markers. Cleanup uses server-side deletes
in child-before-parent order and deliberately excludes authentication users.
