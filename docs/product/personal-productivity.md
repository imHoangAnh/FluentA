# Personal Productivity

## Product Boundary

This contract covers the post-MVP personal productivity surface introduced by
SPEC1 S1: Todo List and Countdown. It defines current Todo daily behavior and
current S1 Countdown behavior. Dashboard aggregation, Habit Tracker, Kanban,
Pomodoro, Journal, scheduled jobs, and mobile drag-and-drop are separate future
stories.

## Todo Outcomes

- A logged-in user can open `/todo` from the protected app navigation.
- A logged-in user can see only their own Todo tasks.
- A logged-in user can view tasks for one selected day, defaulting to today.
- A logged-in user can navigate between days.
- A logged-in desktop user can switch to a Monday-Sunday Week view and navigate
  between weeks.
- A logged-in desktop user can reorder tasks within a day or move tasks between
  days with a drag handle.
- A logged-in user can create a task with a required title, optional note, and
  assigned date.
- A logged-in user can toggle task completion without reloading the page.
- A logged-in user can update task title, note, date, completion, and sort
  order through field-scoped API behavior.
- A logged-in user can delete their own task.
- Incomplete tasks assigned before today are carried over when Todo data is
  accessed. Carried-over tasks show a carried-over indicator.

## Todo Ownership And Authorization Rules

- Every Todo task belongs to exactly one authenticated user.
- API calls for missing, deleted, or foreign-user tasks return `404` so another
  user's data is not revealed.
- Deleted tasks are hidden from normal list endpoints.
- Carry-over mutates only the authenticated user's incomplete past tasks.
- Completed tasks are never carried over.
- Carry-over is idempotent; repeated app opens or Todo reads on the same day do
  not repeatedly change the same task.

## Todo API Contract

All responses use the FluentA envelope.

| Method | Endpoint | Behavior |
| --- | --- | --- |
| `GET` | `/api/v1/todos?date=YYYY-MM-DD` | Carry over eligible tasks, then list active tasks for the selected date. |
| `GET` | `/api/v1/todos?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD` | List active tasks in an inclusive date range for week planning. |
| `POST` | `/api/v1/todos` | Create a task. |
| `PATCH` | `/api/v1/todos/{id}` | Field-scoped update for title, date, note, completion, or sort order. |
| `DELETE` | `/api/v1/todos/{id}` | Soft-delete a task. |

## Todo Validation And Error Rules

- Title is required and must be at most 240 characters after trimming.
- Note is optional and must be at most 4000 characters after trimming.
- Date values must parse as calendar dates.
- Date ranges must include both `startDate` and `endDate`, and `startDate` must
  be on or before `endDate`.
- Sort order must be zero or greater.
- Validation failures return `422 VALIDATION_ERROR`.
- Missing task ownership returns `404 TODO_NOT_FOUND`.

## Todo Carry-Over Rules

- On Todo access, the server finds active incomplete tasks for the user whose
  assigned date is earlier than today.
- Each eligible task keeps its original date in `OriginalDate` the first time it
  is carried over.
- The task's assigned date becomes today and `IsCarriedOver` becomes true.
- A task already carried over today is not changed again.

## Todo Week Planning Rules

- Week view always shows seven columns from Monday through Sunday.
- Selecting a week column changes the date used by the create-task form.
- Desktop drag-and-drop persists the moved task and every affected source or
  target column task with field-scoped `date` and `sortOrder` updates.
- A failed layout update rolls the visible week back and refetches Todo data.
- Mobile drag-and-drop is not part of the current contract.

## Todo Real-Time Rules

- Todo completion changes publish `TodoItemChecked` to the authenticated user's
  SignalR group after durable persistence succeeds.
- Every authenticated app route listens for `TodoItemChecked`.
- Clients receiving `TodoItemChecked` invalidate and refetch cached Todo and
  future Dashboard queries, including while another protected route is visible.
- Durable Todo correctness does not depend on connected clients or successful
  notification delivery.

## Countdown Outcomes

- A logged-in user can open `/countdown` from the protected app navigation.
- A logged-in user can see only their own countdown events.
- A logged-in user can create, edit, and delete countdown events.
- Countdown cards are sorted by nearest target date first.
- Countdown cards display optional color and icon, live client-side remaining
  time, and a completed state when the target date has passed.

## Countdown API Contract

All responses use the FluentA envelope.

| Method | Endpoint | Behavior |
| --- | --- | --- |
| `GET` | `/api/v1/countdowns` | List active countdown events for the authenticated user. |
| `POST` | `/api/v1/countdowns` | Create a countdown event. |
| `PATCH` | `/api/v1/countdowns/{id}` | Update countdown name, target date, color, or icon. |
| `DELETE` | `/api/v1/countdowns/{id}` | Soft-delete a countdown event. |

## Countdown Validation And Error Rules

- Name is required and must be at most 180 characters after trimming.
- Target date must parse as an ISO date-time value and is persisted as UTC.
- Color is optional and must be a hex value like `#4F46E5` when supplied.
- Icon is optional and must be at most 16 characters after trimming.
- Validation failures return `422 VALIDATION_ERROR`.
- Missing countdown ownership returns `404 COUNTDOWN_NOT_FOUND`.

## Deferred Integration

- Dashboard Overview will later aggregate Todo and Countdown data after Todo,
  Countdown, and Habit Tracker exist.
- Scheduled `TodoCarryOverJob` remains deferred until background-job
  infrastructure is planned.
- Mobile drag-and-drop remains deferred; mobile users receive explicit date and
  ordering controls.
