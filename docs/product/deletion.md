# Deletion

Accepted by the user on 2026-10-08.

- Confirm a business resource deletion in the UI. DELETE checks ownership and
  active parent resources, sets nullable `deleted_at` and `updated_at`, and
  returns `{ deleted: true }`. Deleted resources are hidden and cannot be edited.
- Keep database rows and R2 objects indefinitely. There is no Trash, restore,
  Undo, automatic cleanup, retention deadline, or permanent-delete endpoint.
- Board deletion also hides its active descendants. Todo retains its accepted
  future-occurrence behavior; Habit retains unchanged check-ins.
- Vocabulary deletion hides related Practice/Review history while retaining all
  rows. Hide the affected session as a whole, including its items and attempts,
  so a recap cannot show a partial session. Unrelated sessions remain visible.
- Removing an avatar or an image from Note content retains its asset and object;
  mark the removed association/asset with `deleted_at`.
- Remove Quartz and all maintenance polling jobs. Storage startup validation
  remains a startup check, not a cleanup job.
- Use the planned fresh database. Do not apply schema changes to the user's
  existing database as part of local validation.
