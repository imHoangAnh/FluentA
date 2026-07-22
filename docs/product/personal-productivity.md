# Personal Productivity

## Product Boundary

This contract covers the post-MVP personal productivity surface introduced by
SPEC1 S1 and the current Habit Tracker work. It defines current Todo behavior,
current Countdown behavior, the current selected-day Habit Tracker plus monthly
detail calendar, and the Dashboard Overview authenticated home. Journal,
Kanban, Pomodoro, and the Notification inbox have separate product contracts;
external notification delivery and mobile drag-and-drop remain deferred.

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

## Dashboard Presentation Contract

- `/` renders inside the shared FluentA desktop/tablet AppShell with a full
  sidebar on desktop and an icon-only collapsed sidebar at tablet widths.
- Dashboard uses the shared light-theme teal tokens, self-hosted Geist Sans
  Variable typography, accessible focus states, and subtle reduced-motion-safe
  transitions.
- The review queue, daily Todo, next Countdown, and Habit tracker use shared
  card/button/badge primitives while preserving their existing data and
  mutation contracts.
- Loading uses structured skeletons; empty states retain explanatory text and
  the relevant navigation action.
- Chrome and Edge are the blocking browsers for this presentation contract.

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
- `/todo` opens to My Day for the browser's current local date. Week is reached
  from the page-level `...` menu; there is no visible Day/Week switch or
  arbitrary My Day date selector.
- A logged-in desktop user can open the Monday-Sunday Week view, see the
  formatted visible range below `Week`, and navigate between weeks.
- My Day creates a task from a required title-only quick input and immediately
  opens the new task's details. Note remains optional in details.
- Every visible Week day owns a title-only quick input. Enter creates the task
  on that day without opening details.
- A logged-in user can toggle task completion without reloading the page.
- A logged-in user can update task title, note, importance, Repeat, one optional
  time-only reminder, completion, assigned date, and sort order through
  field-scoped API behavior.
- My Day rows contain only independent completion, title, and icon-only
  importance controls. Selecting the title opens a side-by-side detail panel.
- Week rows use the same three visible controls and shared details panel; note,
  Reminder, Repeat, date, and textual importance metadata remain hidden from
  the compact row.
- Title saves on Enter or blur, note saves on blur, and X or Escape closes the
  details panel without changing the task.
- Delete from details or the restricted task context menu requires explicit
  confirmation. The context menu contains only completion, importance, and
  delete actions.
- My Day supports browser-local Importance, Alphabetically, and newest-Creation
  sorting within each completion group. Incomplete tasks also support durable
  manual drag order; starting a drag clears an active automatic sort and saves
  the rendered order as manual.
- Incomplete tasks stay above completed tasks.
- Completed tasks start collapsed with a count, are not draggable, and default
  to most recent `completed_at` first.
- Repeat is optional and offers exactly Daily, Weekdays, Weekly, Monthly, and
  Yearly. Completing a recurring occurrence preserves it and creates one new
  incomplete occurrence with copied title, note, importance, and Repeat.
- Weekdays skips Saturday and Sunday. Monthly and Yearly clamp unavailable days
  to the last valid day of the target month.
- Reopening removes an unchanged generated next occurrence. If that occurrence
  has been edited, it remains and the user is warned that both tasks exist.
- Deleting one occurrence never cascades to another occurrence.
- Reminder is optional and chooses one `HH:mm` time only; its date is always
  the task date. The browser timezone and exact browser-resolved UTC instant
  are retained, so changing device timezone later does not move delivery.
- Completing a task cancels an unsent reminder. A recurring child receives the
  copied reminder time and timezone on its new date.
- Moving a task recomputes its reminder for the destination date. If that
  instant is already past, the move succeeds, clears Reminder, and warns the
  user.
- Selecting a Todo reminder Notification marks it read, opens `/todo`, and
  selects the owned task details even when the task is outside My Day.

## Todo Ownership And Authorization Rules

- Every Todo task belongs to exactly one authenticated user.
- API calls for missing, deleted, or foreign-user tasks return `404` so another
  user's data is not revealed.
- Deleted tasks are hidden from normal list endpoints.
- Task date remains owner-scoped and can change through the authenticated
  update route when the learner moves a task in Week view.
- Duplicate is server-owned: the server reads the owned source and creates a
  new incomplete task on the same date with copied title, note, importance,
  Repeat, and Reminder under a new identity.
- The server normalizes sort order for every affected owned task in the source
  and destination dates; clients do not write another user's ordering.

## Todo API Contract

All responses use the FluentA envelope.

| Method | Endpoint | Behavior |
| --- | --- | --- |
| `GET` | `/api/v1/todos?date=YYYY-MM-DD` | List active tasks for the selected date. |
| `GET` | `/api/v1/todos?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD` | List active tasks in an inclusive date range for week planning. |
| `GET` | `/api/v1/todos/{id}` | Read one active owned task for notification deep-link selection; missing, deleted, and foreign tasks share `404`. |
| `POST` | `/api/v1/todos` | Create a task. |
| `POST` | `/api/v1/todos/{id}/duplicate` | Duplicate one active owned task with all approved fields, a new incomplete identity, the same date, and the next order. |
| `PATCH` | `/api/v1/todos/{id}` | Field-scoped update for title, note, importance, Repeat, Reminder, completion, assigned date, or sort order. Completing or reopening applies recurrence and reminder lifecycle atomically. |
| `DELETE` | `/api/v1/todos/{id}` | Soft-delete a task. |

## Todo Validation And Error Rules

- Title is required and must be at most 240 characters after trimming.
- Note is optional and must be at most 4000 characters after trimming.
- Date values must parse as calendar dates.
- Sort order must be a non-negative integer; an omitted sort order preserves
  the task's current position unless a date move requires normalization.
- `repeatPattern` is optional and accepts only `Daily`, `Weekdays`, `Weekly`,
  `Monthly`, `Yearly`, or explicit `null` to clear it.
- `reminder` is optional and atomic. When present it requires `time` in exact
  `HH:mm`, a supported browser IANA `timeZoneId`, and UTC `scheduledAtUtc` that
  converts back to the task date and selected minute. The instant must be in
  the future; explicit `null` clears the reminder.
- Date ranges must include both `startDate` and `endDate`, and `startDate` must
  be on or before `endDate`.
- Validation failures return `422 VALIDATION_ERROR`.
- Missing task ownership returns `404 TODO_NOT_FOUND`.

## Todo Reminder And Notification Rules

- `FluentA.API` hosts one Hangfire recurring job named `todo-reminders` every
  minute. PostgreSQL remains the reminder source of truth; there is no external
  job per task.
- The scanner claims a bounded due batch with row locks, adds the Notification,
  and marks the reminder sent in one transaction/save.
- A deterministic task-and-instant deduplication key plus the existing unique
  Notification index prevents duplicate delivery across retries.
- Todo notifications may store only the relative action
  `/todo?taskId={ownedTaskId}`. Absolute, protocol-relative, backslash, control
  character, and external paths are rejected by server and client validation.
- Existing Habit and Countdown notifications remain valid with no action path.

## Todo Week Planning Rules

- Week view always shows seven equal columns from Monday through Sunday. The
  header shows weekday names only; dates and task counts are not repeated in
  column headers.
- The page header shows a range such as `July 20–26, 2026` below `Week`.
- Each day owns one title-only Add task input. Selecting a task title opens the
  shared details panel at an approximate 4:1 board/panel desktop split; closing
  details returns the board to full width.
- Week task rows show only completion, a wrapping title, and icon-only
  importance. Duplicate, explicit Move, and confirmed Delete are available
  from the right-click/Shift+F10 menu without a visible overflow control.
- Duplicate keeps the current selection unchanged and is performed only by the
  authenticated server command so hidden note, Repeat, and Reminder state is
  not lost.
- Week view supports desktop pointer drag-and-drop to reorder tasks within a
  day and move tasks between visible days. The same behavior remains covered by
  the explicit context-menu Move action.
- Narrow layouts keep horizontal overflow inside the Week board; they do not
  create page-level horizontal scrolling.
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

- A logged-in user can open `/countdowns` from the protected app navigation.
- A logged-in user can see only their own countdowns.
- A logged-in user can create and delete countdowns; edit is not supported.
- Countdown target uses date only, not date-time.
- Countdown create requires at least one alert and allows up to five alerts.
- Alerts use the milestones `OnTargetDay`, `1DayBefore`, `3DaysBefore`, and
  `7DaysBefore`. The same milestone may be reused when alert times differ.
- Countdown create optionally links one owned ready `countdown-cover` asset.
  One active cover asset can attach to only one active Countdown.
- Countdown cards are ordered with active/upcoming items first by nearest
  `target_date`, then completed items.
- The `/countdowns` workspace uses the title `Countdown`, an icon-only create
  action, and a compact responsive card grid; it does not add an `All` tab.
- Countdown cards use the cover image as the primary visual when present, or a
  light preset fallback when absent.
- Countdown cards show live client-side remaining time before the target date
  and a completed state for seven days after the target date.
- Each card exposes Delete through its overflow menu. Delete requires explicit
  confirmation in an accessible modal before the existing delete request runs.
- Countdown cards stack without horizontal overflow on narrow viewports.

## Countdown API Contract

All responses use the FluentA envelope.

| Method | Endpoint | Behavior |
| --- | --- | --- |
| `GET` | `/api/v1/countdowns` | List owned countdowns visible in the current contract window, including an authorized short-lived cover download URL when attached. |
| `POST` | `/api/v1/countdowns` | Create a countdown with date-based alerts and optional cover asset linkage. |
| `DELETE` | `/api/v1/countdowns/{id}` | Soft-delete a countdown and cancel future unfired alerts. |

## Countdown Validation And Error Rules

- Name is required and must be at most 180 characters after trimming.
- Target date must parse as `YYYY-MM-DD` and cannot be in the past.
- Create requires at least one alert and allows at most five alerts.
- Duplicate alerts with the same milestone and local time are rejected.
- Create fails when any alert would already be in the past at submit time.
- Alert scheduling uses fixed `Asia/Ho_Chi_Minh` business rules and persists
  computed `scheduled_at_utc`.
- Cover asset, when supplied, must be an owned ready `countdown-cover` asset
  that is not attached to another active Countdown.
- Validation failures return `422 VALIDATION_ERROR`.
- Missing countdown ownership returns `404 COUNTDOWN_NOT_FOUND`.

## Countdown Scheduling And Cleanup Rules

- Each alert creates one separate in-app notification.
- Notifications stay simple and include the countdown name plus the milestone.
- Manual countdown delete cancels future unfired alerts, while already created
  notifications stay in the inbox.
- Completed countdowns auto-retire seven days after `target_date`.
- Manual delete detaches and archives a linked ready cover asset. Its object
  is purged asynchronously after the 30-day archive retention period.

## Habit Foundation Outcomes

- A logged-in user can open `/habits` from protected app navigation.
- A logged-in user can create daily or custom-schedule habits with a Start
  Date, Forever or finite successful-check-in Goal Days, and an optional single
  reminder time through the Habit API and Habit page form.
- A logged-in user can see only their own active habits.
- A logged-in user can update habit name, description, semantic icon,
  frequency, custom weekdays, goal, and reminder preference from the Habit
  page. Start Date remains editable only until the first check-in.
- A logged-in user can soft-delete their own habits from the Habit page.
- A logged-in user can query completed habit entries for an owned habit and
  month.
- On desktop and tablet, the Habit page uses an approximately 50/50 list/detail
  layout. Each Habit card shows its semantic icon, compact current streak, and
  one completion action for the date selected in the Monday-through-Sunday
  strip.
- A logged-in user can navigate past or future weeks. Eligible past and current
  dates can be selected; future, pre-start, unscheduled, and completed-goal
  check actions are visible but disabled.
- Each date in the strip shows aggregate completed/eligible progress. Dates
  before Start Date and dates after finite-goal completion do not contribute to
  the denominator.
- The selected Habit detail shows Total check-ins, Monthly check-in rate,
  Current streak, Longest streak, optional finite-goal progress, an optional
  bounded scrolling description, and then the navigable monthly calendar.
- A logged-in user can toggle completion for today or past scheduled dates from
  the monthly grid.
- Future, pre-start, unscheduled custom-frequency, and completed-goal dates are
  rejected by the API. An existing entry can always be unchecked so a finite
  goal can reactivate.
- Habit list responses include Dashboard/detail-ready summary fields: total
  check-ins, current and longest streak, today's scheduled/completed state,
  selected-month completion rate, finite-goal state, and Start Date editability.
- Habit create/edit controls allow reminders to be enabled or disabled and set
  one minute-precision time interpreted in fixed `Asia/Ho_Chi_Minh`. The
  default is `20:00`.
- The dedicated `/habits/{id}/stats` page and API route do not exist; the main
  detail panel is the only Habit statistics surface.
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
- The database enforces positive finite Goal Days. Entry mutation serializes
  per Habit so concurrent different-date requests cannot exceed the goal.

## Habit API Contract

All responses use the FluentA envelope.

| Method | Endpoint | Behavior |
| --- | --- | --- |
| `GET` | `/api/v1/habits?timeZoneId=...&month=YYYY-MM` | List active habits with learner-local and selected-month summary data. |
| `POST` | `/api/v1/habits` | Create a daily or custom-schedule habit. |
| `PATCH` | `/api/v1/habits/{id}` | Update habit details, schedule, goal, and reminder preference. |
| `DELETE` | `/api/v1/habits/{id}` | Soft-delete a habit. |
| `GET` | `/api/v1/habits/{id}/entries?month=YYYY-MM&timeZoneId=...` | List completed entries for one month. |
| `POST` | `/api/v1/habits/{id}/entries` | Toggle one eligible date with `date` and `timeZoneId`. |

## Habit Validation And Error Rules

- Browser timezone IDs are required for schedule-sensitive Habit queries and
  commands.
- Name is required and must be at most 180 characters after trimming.
- Description is optional and must be at most 2000 characters after trimming.
- Icon is stored as one of `Default`, `Book`, `Exercise`, `Water`,
  `Meditation`, `Study`, `Work`, or `Health`; omitted create values default to
  `Default`, while unknown values return `422 VALIDATION_ERROR`.
- Habit responses do not expose a per-Habit color. Habit, Habit Stats, and
  Dashboard map the semantic icon to shared application presentation styling.
- Frequency must be `Daily` or `Custom`.
- Custom habits require at least one valid weekday name.
- Start Date must use `YYYY-MM-DD` and new or changed values must be today or a
  future learner-local date. It cannot change after the first check-in.
- Goal Days is null for Forever or a positive integer. A changed finite value
  must be greater than the current check-in count; switching to Forever is
  always allowed.
- Reminder Time must use 24-hour `HH:mm`; reminder delivery uses fixed Vietnam
  time rather than the browser timezone.
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
- Total check-ins, current/longest streak, selected-month rate, and finite-goal
  state are computed by the Habit API from scheduled days and durable entries.

## Deferred Integration

- A dedicated `/api/v1/dashboard/overview` aggregation endpoint remains
  deferred until there is enough cross-domain read-model pressure to justify it.
- Dashboard widget visibility can be toggled from Dashboard settings and is
  persisted in the current browser.
- PostgreSQL-backed Hangfire infrastructure registers `HabitReminderJob`,
  countdown alert/cleanup work, and `DatabaseCleanupJob` schedules.
- Reminder and countdown jobs persist delivery markers before retry completion,
  preventing duplicate daily/event notifications.
- Habit reminders are in-app only. External email, push, or SMS delivery remains
  deferred to the notifications epic.
- Mobile drag-and-drop remains deferred; mobile users receive explicit date and
  ordering controls.
