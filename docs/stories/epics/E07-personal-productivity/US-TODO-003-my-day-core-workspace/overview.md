# Overview

## Current Behavior

`/todo` currently exposes Day and Week controls, a multi-field Day create form,
separate Active and Completed sections, and rows that render note/delete
controls directly. The persisted Todo contract has title, note, date, manual
sort order, and completion state, but no importance field.

The working tree already contains user-owned edits in `TodoPage.tsx` and
`docs/product/personal-productivity.md`. This story must preserve and integrate
with those edits rather than replace either file wholesale.

## Target Behavior

The default `/todo` surface is My Day and lists today only. A title-only quick
input creates a task and immediately selects it. Selecting a task opens a
side-by-side right detail panel where completion, title, durable importance,
note, close, and confirmed delete are available. Reminder and Repeat are added
by later registered stories and are not faked in this story.

Incomplete rows show only completion, title, and an icon-only importance star.
Completed is collapsed by default with a count. My Day supports browser-local
Importance, Alphabetically, and newest-Creation sorting within each completion
group, plus persisted manual drag order for incomplete tasks. Right-click or
Shift+F10 opens the restricted task context menu. Week remains reachable from
the page-level `...` menu and its shipped behavior is preserved until
`US-TODO-006` changes its presentation.

## Acceptance Criteria

1. Opening `/todo` shows `My Day`, today's label, the page-level `...` menu, and
   a title-only Add task control; no Grid, Group, Suggestions, or visible
   Day/Week switch appears.
2. Empty or whitespace-only titles are rejected. Enter creates a task dated
   today and immediately opens its details.
3. A My Day row contains completion, title, and icon-only star. Note and visible
   per-row overflow/delete controls are absent.
4. Row selection opens a side-by-side detail panel. X and Escape close it;
   completion leaves it open.
5. Title saves on Enter or blur, note saves on blur, and the row/panel star
   mutate the same durable owner-scoped `isImportant` state.
6. Delete from the panel or context menu requires confirmation before the API
   call. Cancellation preserves the task.
7. Right-click and Shift+F10 expose only complete/active, importance, and delete
   actions in My Day.
8. Completed starts collapsed, shows a count, expands on request, is not
   draggable, and is ordered by most recent completion.
9. Automatic sort choices apply separately within incomplete/completed groups
   and persist only in the current browser. Starting an incomplete-task drag
   while one is active clears that preference, switches to manual order, and
   persists the resulting order.
10. Week remains reachable through `...` and its existing navigation,
    completion, reorder, cross-day move, delete, and explicit accessible move
    behavior do not regress.
11. Foreign or deleted task mutation remains owner-nondisclosing, and all
    existing title/note/date/completion contracts remain compatible.

## Non-Goals

- Reminder storage or delivery.
- Repeat storage or generated occurrences.
- Week v2 presentation or Duplicate task.
- Steps, separate due dates/My Day membership, tags, files, multiple reminders,
  custom recurrence, Grid, Group, or Suggestions.
