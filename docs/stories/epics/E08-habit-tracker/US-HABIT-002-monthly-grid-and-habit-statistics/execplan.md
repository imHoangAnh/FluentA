# Execution Plan

## Steps

1. Add a current story pack and Harness story row for `US-HABIT-002`.
2. Implement the protected Habit route and workspace navigation link.
3. Build `HabitPage` with month navigation, create/edit/delete form, and a
   horizontally scrollable grid.
4. Wire TanStack Query mutations to the existing Habit API client.
5. Add focused React tests for route protection, empty state, habit summaries,
   grid cells, and disabled future/unscheduled dates.
6. Run frontend lint/tests/build, then run a focused browser/API smoke if the
   local stack is available.
7. Update product/story evidence and Harness trace.

## Scope Boundaries

- Do not add new backend endpoints unless a blocker proves the existing API
  cannot support the story.
- Do not implement reminders, Dashboard, or cross-tab synchronization here.
- Do not calculate longest streak client-side as a permanent product contract.
