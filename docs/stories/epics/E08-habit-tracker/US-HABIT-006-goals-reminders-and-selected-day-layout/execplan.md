# Exec Plan

## Goal

Deliver the approved Habit Tracker redesign as one coherent vertical slice:
selected-day list interaction, durable start/goal/reminder settings, fixed
Vietnam-time reminder delivery, main-panel statistics, removal of the dedicated
Stats route, and the explicitly approved Habit-only data reset.

## Work Shape

Use one high-risk story, `US-HABIT-006`, under the existing E08 Habit Tracker
epic. The schema, API, job, Dashboard consumer, and Habit page must move
together because none of the technical layers produces a usable independently
releasable outcome.

## Scope

In scope:

- The D1-D19 behavior in `overview.md`.
- Habit/HabitEntry-only destructive migration and database constraints.
- Domain, repository, application service, controller, recurring job, and
  notification-deduplication integration changes.
- Habit page selected-day interaction and form/detail redesign.
- Removal of the Habit Stats API/UI route and replacement proof.
- Dashboard compatibility, realtime cache behavior, tests, product docs,
  decision record, Harness matrix, and trace evidence.

Out of scope:

- Any reset outside `habits` and `habit_entries`.
- User-selectable timezones, multiple reminders, mobile redesign, new semantic
  icons, color changes, or unrelated productivity behavior.
- External email, push, SMS, or other reminder delivery.

## Risk Classification

Lane: `high-risk`.

Risk flags:

- Data model and irreversible data deletion.
- Public Habit request/response and route changes.
- Existing Habit, Dashboard, realtime, notification, and background-job
  behavior.
- User input for dates, positive goal counts, and local times.
- Concurrent toggle behavior at the finite-goal boundary.

Hard gates:

- Human-approved destructive migration scope.
- Live PostgreSQL migration/schema proof.
- Owner-scoped API and negative validation proof.
- Retry-safe reminder delivery proof.
- Desktop/tablet browser proof for the selected-day workflow.

## Recommended Path

1. Add the new Habit invariants and boundary parsing first, including
   transactional goal-safe toggles.
2. Generate one EF migration, then review and insert the explicit ordered
   `habit_entries`/`habits` deletion before the new required columns are used.
3. Extend the existing Habit list response instead of adding another details
   endpoint; accept an optional selected month so the main panel and Dashboard
   share one server-authoritative summary contract.
4. Reuse the existing once-per-Habit/date marker plus notification dedupe key,
   but run the reminder recurrence every minute and evaluate due times in fixed
   `Asia/Ho_Chi_Minh` local time.
5. Break the oversized Habit page into focused feature-owned presentation
   components while preserving its React Query and realtime boundaries.
6. Remove the dedicated Stats route only after equivalent Total/Longest/current
   statistics are available on the main Habit response and panel.

## Expected Integration Boundaries

- Domain: `Habit` start/goal/reminder invariants and schedule eligibility.
- Application: Habit DTO parsing, owner-scoped summaries, validation, streaks,
  and goal-safe check-in orchestration.
- Infrastructure: EF configuration/migration, batched entry queries,
  transactional toggles, and reminder job due-time filtering.
- API: existing `/api/v1/habits` routes with an extended list/create/patch
  contract and removal of `GET /{habitId}/stats`.
- Frontend: `features/habits` API/types/routes/page/components and design-system
  styles; Dashboard remains a public consumer of the Habit feature API.
- Proof: Domain/Application tests, live PostgreSQL schema/API/job probes,
  Vitest, Playwright, build/lint, and Harness verification.

## Expected Files

- `src/backend/FluentA.Domain/BoundedContexts/Habit/Entities/Habit.cs`
- `src/backend/FluentA.Application/BoundedContexts/Habit/**`
- `src/backend/FluentA.Infrastructure/Habit/EfHabitRepository.cs`
- `src/backend/FluentA.Infrastructure/BackgroundJobs/ScheduledProductivityJobs.cs`
- `src/backend/FluentA.Infrastructure/Persistence/Configurations/HabitConfiguration.cs`
- `src/backend/FluentA.Infrastructure/Persistence/Migrations/*`
- `src/backend/FluentA.API/Controllers/HabitsController.cs`
- `src/backend/FluentA.API/BackgroundJobs/RecurringJobRegistration.cs`
- `src/frontend/src/features/habits/**`
- `src/frontend/src/features/dashboard/pages/DashboardPage.tsx`
- `src/frontend/src/styles/design-system.css`
- Relevant backend unit tests, frontend Vitest tests, and Habit/Dashboard E2E
  specs.
- `docs/product/personal-productivity.md`, this story packet, the decision
  record, Harness story row, and final trace.

## Work Phases And Exit States

1. **Durable model and invariants**
   - Exit: Start Date, nullable positive Goal Days, and one Vietnam-local
     Reminder Time are validated by domain/application tests; start and goal
     editing rules are deterministic.
2. **Persistence and migration**
   - Exit: reviewed EF migration deletes only HabitEntry/Habit rows, adds the
     approved columns/constraints/index, applies to live PostgreSQL, and cannot
     silently claim to restore deleted rows on Down.
3. **API, statistics, and concurrency**
   - Exit: owner-scoped create/list/patch/entries endpoints expose the new
     fields and reject pre-start, future, unscheduled, completed-goal, locked
     Start Date, and non-increasing finite Goal cases; concurrent toggles cannot
     exceed Goal Days.
4. **Reminder scheduling**
   - Exit: minute recurrence creates at most one in-app notification per due
     Habit/date in Vietnam time, skips checked/inactive/unscheduled Habits, and
     catches up after a delayed worker run without duplicating delivery.
5. **Habit and Dashboard UI**
   - Exit: desktop/tablet selected-day strip, aggregate progress, single row
     toggle, form fields, goal/description/calendar detail order, and Dashboard
     quick toggle all use the new contract with existing colors and keyboard
     semantics.
6. **Route retirement and release proof**
   - Exit: no active `/habits/:habitId/stats` route or Stats page dependency
     remains; product docs, decision, matrix evidence, focused proof, and trace
     agree with shipped behavior.

## Validation Shape

- Full Domain and Application unit suites plus focused Habit assertions.
- API build and frontend lint/test/build.
- Live PostgreSQL migration, column/constraint/index, deletion-boundary, and
  concurrent-toggle proof.
- Live or deterministic invocation of the reminder job with notification and
  marker assertions.
- Chromium and Edge desktop/tablet Playwright for create/edit/start/goal/time,
  selected-day progress, goal completion/reactivation, long description scroll,
  route removal, Dashboard compatibility, and no relevant console errors.
- `git diff --check`, stale-reference search, story verification, matrix update,
  and Harness trace.

## Stop Conditions

Pause for human confirmation if:

- Any foreign key or job behavior would require deleting data outside Habit and
  HabitEntry.
- Migration generation proposes dropping or rebuilding unrelated tables.
- The API needs a new timezone preference or another endpoint not described in
  this plan.
- The reminder design requires external delivery or more than one time per
  Habit.
- Validation requirements must be weakened or the unrelated dirty Flashcard or
  Todo files cannot be preserved.

## Rejected Alternatives

1. Split backend and frontend into independently releasable stories. Rejected
   because the intermediate API/schema state has no accepted user outcome.
2. Compute Total/Longest/goal completion only in the browser. Rejected because
   Dashboard, jobs, concurrency, and validation need server-authoritative data.
3. Persist a goal-completed flag/date. Rejected because unchecking an earlier
   entry reactivates a Habit; completion is derived from durable entries and the
   current goal.
4. Schedule one Hangfire recurring job per Habit. Rejected because per-record
   recurring job churn is harder to reconcile and clean up than one indexed
   minute scanner with durable deduplication.
5. Keep the Stats route as a compatibility alias. Rejected by approved D10.
