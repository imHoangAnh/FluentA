# Todo migration contract

Status: implemented locally on 2026-10-08. Todo is independent of Project.

## User flow

1. Open My Day to see tasks for one date, or Week to see seven dates.
2. Add a task with a title and date. Open details to edit its title, note,
   importance, date, order, and optional repeat pattern. A task can be duplicated.
3. Mark a task complete. It moves to the completed section. Reopen it to make
   it active again. Completed tasks remain visible for their own date.
4. For Daily, Weekdays, Weekly, Monthly, or Yearly repetition, completing an
   occurrence creates the next occurrence once. Reopening the parent hides a
   pristine generated child. An edited child stays and produces a warning.
5. Confirm Delete to hide the selected task. If it has already-created future
   occurrences, hide those too. Earlier completed occurrences stay visible.

## Deletion and storage

- DELETE `/api/v1/todos/{todoId}` requires ownership. A missing, foreign, or
  already-deleted task returns `TODO_NOT_FOUND`.
- The selected task and eligible generated descendants keep their database
  rows. Their `deleted_at` and `updated_at` become the same UTC timestamp.
- A descendant dated before the selected task remains visible. Traversal still
  follows its children so later descendants are hidden.
- GET, date list, and date-range list omit deleted rows. Todo has no Trash or
  restore action. No stored asset is associated with Todo.

## Removed behavior

Todo no longer stores or sends reminders. Its API, UI, scheduler branch, and
database reminder columns are removed by `TodoSimplification`. Todo no longer
subscribes to realtime events; changes appear after ordinary query refresh.
Habit reminder/realtime behavior is separate and awaits its own migration.

## Validation

The focused PostgreSQL test migrates a fresh isolated schema, completes two
occurrences, deletes the middle one, then checks all three stored rows and
visible date lists. The frontend test covers the confirmation and update flow.
