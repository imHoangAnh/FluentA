# Exec Plan

## Goal

Deliver the approved semantic Habit icon contract and the desktop/tablet weekly
Habit layout without changing scheduling, streak, reminder, or ownership rules.

## Scope

In scope:

- D1-D14 from `overview.md`.
- Domain, application, EF migration/snapshot, API, frontend, tests, product
  contract, decision record, Harness row, and release evidence.

Out of scope:

- Mobile-specific redesign.
- Automatic deletion or conversion of existing Habit data.
- New endpoints, streak algorithms, schedule rules, or reminder behavior.

## Risk Classification

Lane: high-risk.

Risk flags:

- Data model: drops `habits.color` and changes `habits.icon` semantics/nullability.
- Public contracts: removes `color` and constrains `icon` values.
- Existing behavior: changes all Habit icon rendering and weekly interactions.

Hard gates:

- Schema migration and intentional lack of legacy icon compatibility.

## Work Phases

1. Validate Lucide exports, EF migration feasibility, cross-month week query
   behavior, current fixtures, and desktop/tablet layout constraints.
2. Add `HabitIcon`, update the aggregate/service/DTO contract, and replace
   color/free-form-icon unit expectations.
3. Add and inspect the EF migration and snapshot. Confirm no delete statements
   or Habit/HabitEntry data-cleanup SQL is present.
4. Update the TypeScript API contract and shared semantic icon mapping.
5. Implement selected-week navigation, aligned seven-cell rows, direct cell
   toggles, 50/50 layout, description placement, and shared theme styling.
6. Apply icon rendering consistently to Habit, Habit Stats, and Dashboard.
7. Update focused unit/integration/E2E proof and product documentation.
8. Run the proof ladder, record evidence, reconcile the Harness matrix, and
   add a closeout trace.

## Expected Integration Boundaries

- Domain: `Habit.cs`, a new `HabitIcon.cs`, and Habit unit tests.
- Application/API: `HabitDtos.cs`, `HabitService.cs`, and service tests.
- Persistence: `HabitConfiguration.cs`, new EF migration, and snapshot.
- Frontend contract/presentation: `habit.api.ts`, shared icon map,
  `HabitPage.tsx`, `HabitStatsPage.tsx`, `DashboardPage.tsx`, and `styles.css`.
- Browser proof: focused Habit grid/stats/dashboard Playwright scenarios.
- Product truth: `docs/product/personal-productivity.md` and decision 0045.

## Observable Exit State

- API responses contain a valid semantic `icon` and no `color`.
- Invalid icon create/update receives `422`.
- Database schema has required string `icon` and no `color` column.
- Desktop and tablet show two columns with aligned Monday-Sunday cells.
- Week navigation crosses month/year boundaries without missing status data.
- Eligible weekly cells toggle; future and unscheduled cells cannot toggle.
- Description and icon appear on all approved surfaces in their approved places.
- Focused backend, frontend, migration, and browser proof passes.

## Stop Conditions

Pause for human confirmation if:

- The migration would require destructive cleanup beyond dropping `color`.
- Legacy production Habit data must be preserved without a database reset.
- Existing entry endpoints cannot support a cross-month selected week without a
  new API shape.
- Tablet 50/50 usability requires hiding approved content or horizontal page
  scrolling.
- Any implementation requires changing scheduling, streak, ownership,
  reminder, or SignalR contracts.

