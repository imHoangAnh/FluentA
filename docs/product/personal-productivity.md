# Personal Productivity

## Product Boundary

This contract covers the post-MVP personal productivity surface introduced by
SPEC1 S1 and the current Habit Tracker work. It defines current Todo behavior,
current Countdown behavior, the current Habit API plus monthly grid UI, and the
Dashboard Overview authenticated home. Journal and Kanban have separate product
contracts. Pomodoro, scheduled jobs, notifications, widget visibility settings,
and mobile drag-and-drop are separate future stories.

## Dashboard Overview Outcomes

- A logged-in user lands on `/` after login and sees the Dashboard Overview.
- The previous vocabulary workspace remains available at `/vocabulary`.
- The Dashboard greets the learner based on local time and displays the current
  local date.
- The Dashboard shows Flashcard due/new card totals, a review action, and the
  current Flashcard streak from the existing Flashcard dashboard contract.
- The Dashboard shows today's Todo tasks, limited to a small visible set, with
  inline completion toggles.
- The Dashboard shows today's scheduled Habits, current streak summaries, and
  inline completion toggles.
- The Dashboard shows the nearest Countdown events with live client-side
  remaining time.
- Dashboard navigation links remain available for Vocabulary, Flashcards, Todo,
  Habits, Countdown, and logout.

## Dashboard Data Rules

- Dashboard data is derived from existing user-owned Todo, Habit, Countdown,
  and Flashcard endpoints; there is no dedicated Dashboard API endpoint yet.
- Todo rows use the browser's current local date.
- Habit rows use the browser timezone for schedule-sensitive summary fields and
  toggles.
- Countdown cards are sorted by nearest target date first and limited to the
  nearest three events.
- Todo and Habit quick toggles call their existing domain mutation endpoints and
  invalidate both domain caches and future Dashboard cache keys.
- Dashboard correctness does not depend on a new database schema.

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

## Habit Foundation Outcomes

- A logged-in user can open `/habits` from protected app navigation.
- A logged-in user can create daily or custom-schedule habits through the Habit
  API and Habit page form.
- A logged-in user can see only their own active habits.
- A logged-in user can update habit name, description, color, icon, frequency,
  and custom weekdays from the Habit page.
- A logged-in user can soft-delete their own habits from the Habit page.
- A logged-in user can query completed habit entries for an owned habit and
  month.
- A logged-in user can navigate a monthly contribution grid with habits as rows
  and days as columns.
- A logged-in user can toggle completion for today or past scheduled dates from
  the monthly grid.
- Future dates and unscheduled custom-frequency dates are disabled in the grid.
- The API rejects future dates and unscheduled custom-frequency dates.
- Habit list responses include Dashboard-ready summary fields: current streak,
  today's scheduled/completed state, and monthly completion rate.
- Habit rows display current streak, today's state, and selected-month
  completion rate.
- Habit create/edit controls allow daily reminders to be enabled or disabled;
  disabled habits are excluded from the scheduled reminder job.
- A logged-in user can open `/habits/{id}/stats` from a Habit row to inspect
  current streak, longest streak, and last 7-day and 30-day completion rates.
- The monthly grid remains horizontally scrollable on narrow screens instead of
  hiding days.
- Habit entry toggles broadcast `HabitChecked` after durable persistence
  succeeds.
- Every authenticated app route listens for `HabitChecked` and invalidates
  Habit plus future Dashboard query caches, including while another protected
  route is visible.

## Habit Ownership And Authorization Rules

- Every Habit belongs to exactly one authenticated user.
- Every HabitEntry belongs to exactly one Habit.
- API calls for missing, deleted, or foreign-user habits return `404` so
  another user's data is not revealed.
- Deleted habits are hidden from normal list and entry endpoints.
- The database enforces one completion entry per habit/date.

## Habit API Contract

All responses use the FluentA envelope.

| Method | Endpoint | Behavior |
| --- | --- | --- |
| `GET` | `/api/v1/habits?timeZoneId=...` | List active habits with learner-local summary data. |
| `POST` | `/api/v1/habits` | Create a daily or custom-schedule habit. |
| `PATCH` | `/api/v1/habits/{id}` | Update habit details and schedule. |
| `DELETE` | `/api/v1/habits/{id}` | Soft-delete a habit. |
| `GET` | `/api/v1/habits/{id}/stats?timeZoneId=...` | Get learner-local statistics for one owned habit. |
| `GET` | `/api/v1/habits/{id}/entries?month=YYYY-MM&timeZoneId=...` | List completed entries for one month. |
| `POST` | `/api/v1/habits/{id}/entries` | Toggle one eligible date with `date` and `timeZoneId`. |

## Habit Validation And Error Rules

- Browser timezone IDs are required for schedule-sensitive Habit queries and
  commands.
- Name is required and must be at most 180 characters after trimming.
- Description is optional and must be at most 2000 characters after trimming.
- Color is optional and must be a hex value like `#22C55E` when supplied.
- Icon is optional and must be at most 16 characters after trimming.
- Frequency must be `Daily` or `Custom`.
- Custom habits require at least one valid weekday name.
- Month values must be `YYYY-MM`.
- Entry dates must be `YYYY-MM-DD`.
- Future dates cannot be toggled.
- Unscheduled custom-frequency dates cannot be toggled.
- Validation failures return `422 VALIDATION_ERROR`.
- Missing habit ownership returns `404 HABIT_NOT_FOUND`.

## Habit Streak And Schedule Rules

- Habit calendar dates and streak calculations use the validated browser
  timezone.
- A current streak ends today when the habit is completed today; otherwise, it
  may continue through yesterday.
- Daily habits are scheduled every day.
- Custom habits are scheduled only on their configured weekdays.
- Unscheduled days do not break custom-habit streaks and do not count toward
  completion-rate denominators.
- Longest streak and last 7/30-day rates are computed by the Habit API from
  scheduled days and durable completion entries.

## Deferred Integration

- A dedicated `/api/v1/dashboard/overview` aggregation endpoint remains
  deferred until there is enough cross-domain read-model pressure to justify it.
- Dashboard widget visibility can be toggled from Dashboard settings and is
  persisted in the current browser.
- PostgreSQL-backed Hangfire infrastructure registers current schedules from
  `FluentA.Worker`, not from the API. Todo carry-over, daily unchecked-habit
  reminder queuing, one-time expired countdown alerts, expired pending-asset
  cleanup, and 30-day product-record cleanup are implemented.
- Reminder and countdown jobs persist delivery markers before retry completion,
  preventing duplicate daily/event notifications.
- External notification delivery and per-habit reminder preferences remain
  deferred to the notifications epic.
- Mobile drag-and-drop remains deferred; mobile users receive explicit date and
  ordering controls.
