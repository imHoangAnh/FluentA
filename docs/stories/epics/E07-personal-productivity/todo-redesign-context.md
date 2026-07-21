# Todo My Day Redesign Context

## Status

Exploration complete. The human approved the complete D1-D58 decision set and
the Week v2 visual direction on 2026-07-21. Planning is authorized;
implementation remains gated by an approved plan and successful validation.

## Classification

- Input type: change request.
- Lane: high-risk.
- Risk flags: data model, public contract, existing behavior, weak proof, and
  multi-domain Todo/Notification/background-job behavior.

## Current Behavior

- `/todo` supports a selected Day view and a Monday-Sunday Week view.
- Day currently uses a dedicated create form and separate collapsible Active
  and Completed sections.
- Week supports navigation, within-day reorder, cross-day movement, completion,
  deletion, and an accessible explicit Move control.
- The current task contract contains `title`, optional `note`, `date`,
  `sortOrder`, completion timestamps, and audit timestamps.
- The API supports date/range listing, create, field-scoped update, and delete.
  It does not currently expose importance, reminders, recurrence, recurrence
  lineage, or a duplicate command.
- Todo completion already participates in authenticated SignalR cache
  invalidation. The Notification domain and scheduled-job runtime already exist,
  but Todo reminder delivery is not part of the current product contract.

Relevant evidence:

- `docs/product/personal-productivity.md`
- `docs/stories/epics/E07-personal-productivity/US-TODO-001-todo-daily-foundation/`
- `docs/stories/epics/E07-personal-productivity/US-TODO-002-todo-week-planning/`
- `src/frontend/src/features/todo/pages/TodoPage.tsx`
- `src/frontend/src/features/todo/pages/TodoWeekView.tsx`
- `src/frontend/src/features/todo/api/todo.api.ts`

## Feature Boundary

Redesign the Day surface as a Microsoft To Do-inspired My Day list and refine
the Week planner presentation without changing its shipped planning behavior.
Add a task detail panel, importance, single-time reminders, fixed recurrence
choices, My Day manual reorder and sorting, and Week-only duplication. Preserve
existing ownership, soft-delete, completion grouping, date, Week navigation and
movement, and realtime boundaries unless a locked decision below explicitly
changes presentation or behavior.

## Locked Decisions

### Navigation And Page Structure

- **D1:** My Day is the default Todo surface.
- **D2:** The existing Week planning behavior remains; Week moves from the
  visible Day/Week switch into the page-level `...` menu beside My Day. Its
  presentation follows the separately approved Week decisions below.
- **D7:** My Day lists today only. Other dates are viewed and managed in Week.
- **D20:** My Day has List only; there is no Grid/List switch.
- **D21:** There is no Group control.
- **D22:** There is no Suggestions control.
- **D49:** Week displays the title `Week`; its page-level `...` menu contains
  `My Day` to return.

### Task Creation And Detail Panel

- **D3:** Selecting a task opens a right-side detail panel. Only explicitly
  approved features belong in that panel.
- **D4:** Tasks do not have steps/subtasks and the panel has no Add step action.
- **D6:** A task keeps one scheduling date, which controls its My Day/Week
  position. The panel has no Add due date action.
- **D12:** Tasks do not have tags.
- **D13:** Tasks do not have file attachments.
- **D14:** Note is visible and editable only in the detail panel, autosaves on
  blur, and is not rendered in the compact task row.
- **D23:** Add a task is a quick title input; Enter creates the task.
- **D24:** Title is required. Note, importance, reminder, and repeat are
  optional.
- **D25:** The panel title is directly editable and autosaves on Enter or blur.
- **D26:** Delete from the panel or task menu always requires confirmation.
- **D33:** The panel closes through a visible X action or Escape.
- **D34:** The importance star is available in both the task row and panel and
  edits one shared state.
- **D35:** The panel does not show an Added to My Day row.
- **D36:** The panel does not show task creation date.
- **D37:** Completing the selected task keeps the panel open with updated state.
- **D43:** On the My Day surface at narrower supported widths, the detail panel
  stays beside the list and the list shrinks; the panel does not overlay the
  list.
- **D53:** After quick creation in My Day, the new task's detail panel opens
  automatically.

The resulting panel contains only task completion, editable title, importance,
Reminder, Repeat, Note, close, and confirmed Delete controls.

### Importance, List Sections, Sorting, And Reorder

- **D5:** Importance is durable task data and is toggled by a star.
- **D19:** My Day sort choices are Importance, Alphabetically, and Creation
  date. Sorting applies within the incomplete and Completed groups rather than
  mixing completion states.
- **D30:** Importance sorts important tasks first, Alphabetically sorts A-Z,
  and Creation date sorts newest first.
- **D31:** The selected My Day sort is stored in the current browser, not the
  account.
- **D38:** Completed is collapsed by default, shows a count, and can be toggled.
- **D39:** Incomplete tasks render directly below Add a task without an Active
  Tasks heading or Mark all as done action.
- **D40:** Incomplete My Day tasks support persisted manual drag reorder when
  no automatic sort is active.
- **D41:** Starting a drag while an automatic sort is active disables that sort,
  switches to manual order, and saves the resulting order.
- **D42:** Completed tasks are not draggable and remain ordered by most recent
  completion.

### Task Menus And Week Duplication

- **D15:** The My Day task context menu contains only Mark completed/active,
  Mark/Remove importance, and Delete task.
- **D32:** A task context menu opens by right-click only. Shift+F10 remains the
  keyboard path; there is no visible per-row `...` action.
- **D16:** Week supports Duplicate task.
- **D17:** Duplicate first creates a copy on the same day; the user may then
  drag the copy to another Week day.
- **D18:** Duplicate copies title, note, importance, reminder, and repeat. The
  copy has a new identity and starts incomplete.
- **D50:** Week Duplicate is available in the right-click task menu only, with
  Shift+F10 as the keyboard path and no visible Copy action.

### Approved Week Presentation

- **D54:** The Week header shows `Week`, with the range such as
  `July 20–26, 2026` directly below it. Day-column headers show weekday names
  only and do not repeat calendar dates.
- **D55:** Every weekday column owns a My Day-style quick Add task control. It
  accepts a required title and creates the task in that day. The user clicks the
  created task when they want to open details; Week creation does not
  automatically open the panel.
- **D56:** A Week task row renders only its completion control, title, and an
  icon-only importance star. Reminder, repeat, note, date, and textual
  `Important` metadata do not appear in the row.
- **D57:** Selecting a Week task opens the same approved task details surface as
  My Day.
- **D58:** With details open on desktop, the Week board uses approximately four
  fifths of the content width and the right-side details panel uses one fifth.
  Closing details expands the Week board to the full available width. Seven
  equal day columns must remain readable without overlapping controls, clipped
  titles, or page-level horizontal overflow at the supported desktop width.

### Reminder

- **D8:** Todo supports a durable in-app reminder that creates a FluentA
  notification when due.
- **D9:** Reminder selects time only; its calendar date is always the task date.
- **D27:** A reminder cannot be saved when the task date and selected time form
  a past instant.
- **D28:** Moving a task so its reminder would be in the past succeeds, clears
  the reminder, and informs the user.
- **D44:** Completing a task cancels its unsent reminder. A recurring task's new
  occurrence receives the copied reminder time.
- **D48:** Selecting a Todo reminder notification opens `/todo` and selects the
  corresponding task in the detail panel.
- **D51:** The browser timezone at reminder save time determines the scheduled
  instant. Later device timezone changes do not shift that instant.
- **D52:** Each task has at most one reminder.

### Repeat

- **D10:** Repeat is an enum with exactly `Daily`, `Weekdays`, `Weekly`,
  `Monthly`, and `Yearly`; there is no Custom option.
- **D11:** Completing a recurring occurrence preserves the completed task and
  creates one new incomplete task for the next occurrence. The new task copies
  title, note, importance, reminder, and repeat.
- **D29:** Weekdays means Monday-Friday. Monthly and Yearly recurrence clamp an
  unavailable day to the last valid day of the target month, including 29
  February to 28 February in a non-leap year.
- **D45:** Reopening a completed recurring occurrence removes the unchanged next
  occurrence that the system generated automatically.
- **D46:** If that generated next occurrence was edited, it is retained; the old
  occurrence reopens and the user is warned that both tasks now exist.
- **D47:** Delete removes only the selected occurrence. It never cascades to
  other existing occurrences. Deleting the current occurrence before completion
  ends the chain because no next occurrence has been generated.

## Explicit Exclusions

- Steps or subtasks.
- Separate My Day membership and due-date fields.
- Tags and categories.
- File attachments.
- Grid view, Group, and Suggestions.
- Multiple reminders.
- Custom recurrence rules.
- Visible per-task overflow menus.
- Cascading deletion of future recurring occurrences.
- Changes to Week date navigation, completion, persisted ordering, drag/drop,
  cross-day movement, or accessible explicit Move behavior.
- Reminder, repeat, note, date, or textual Important metadata in Week rows.

## Deferred Technical Questions For Planning

- Choose the schema and API shape for importance, reminder scheduling metadata,
  recurrence enum, and occurrence lineage without weakening ownership rules.
- Decide how scheduled reminder delivery uses the existing Worker/Hangfire and
  Notification seams, including cancellation and idempotency.
- Define the reliable edited-versus-unchanged check for an autogenerated next
  occurrence before recurrence rollback.
- Choose whether duplication is a dedicated server command or a create command
  composed from an owned task read, while keeping the operation owner-scoped.
- Define a task-selection/deep-link contract for notification navigation.
- Reconcile local sort preference with durable manual `sortOrder` and current
  Day/Week caches.
- Prove both the My Day side-by-side narrow layout and the approved Week 4:1
  board/detail desktop layout without page-level horizontal overflow.
- Split the approved initiative into the smallest safe vertical stories and
  define unit, live integration, E2E, platform, migration, job, and log proof.

## Approval Gate

The human approved this decision summary on 2026-07-21. `harness-planning` may
create executable story packets. Product/API/schema/code changes must not begin
until the resulting plan is approved and `harness-validating` records readiness
evidence for the current story.
