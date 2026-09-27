# Execution Plan: Quartz scheduling and Vietnam regional time

Date: 2026-09-17

## Status

Completed - scoped implementation and validation passed

## Outcome

Persist precise reminder triggers in PostgreSQL using Quartz, recover schedules
after restarts, and show Vietnam calendar dates and wall-clock times independently
of the browser timezone. Store instants in UTC; do not shift date-only fields.

## Authority and decisions

- User approved replacing Hangfire with Quartz and per-reminder triggers.
- Todo catch-up: once when still incomplete; Habit: current Vietnam day only;
  Countdown: catch up until the target day ends, skip expired occurrences.
- User approved keeping Pomodoro lifecycle changes out of this migration.
- App supports Vietnam only: frontend timezone Asia/Ho_Chi_Minh (UTC+7), stored
  instants UTC. Existing absolute reminder instants must not be shifted.
- Review overdue words retain their due date; remove the nightly deferral job.
  Next review is based on actual answer date and existing SRS intervals.
- Todo recurrence remains completion-driven, based on the original task date.

## Scope and ownership

- Quartz worker: Infrastructure/Scheduling, package/DI, API scheduler composition,
  persistent schema, isolated scheduler tests.
- Business worker: Infrastructure/BackgroundJobs and occurrence execution tests.
- Frontend worker: shared Vietnam time helpers and affected feature UI/tests.
- Lead: integration, app/deployment configuration, documentation, final checks.
- Durable public behavior/runbook is `src/backend/SCHEDULING.md`; `docs/` is
  ignored local Harness state in this checkout, so public README links target
  the tracked backend document instead.
- Preserve four-project architecture, in-process hosting and existing date-only
  contracts. No production deployment, database reset, push or commit requested.

## Approach

1. Implement persistent scheduler and occurrence-specific execution adapters.
2. Reconcile DB-owned reminders on changes, startup and periodic repair; reject
   stale triggers, prevent duplicate notifications, handle missed schedules.
3. Remove obsolete Review deferral and Todo carry-over scheduling.
4. Standardize frontend Vietnam time and keep date-only values unchanged.
5. Integrate configuration/docs and validate recovery, timezone and concurrency.

## Risks and recovery

- Stop old API/Hangfire instances before Quartz cutover; retain old scheduler
  tables for recovery, never run both schedulers against the same business DB.
- Business writes and scheduling may fail separately; reconciliation repairs
  missing/stale schedules and execution rechecks current business state.
- A scheduler does not guarantee zero delay under downtime or resource pressure.
- Use isolated test databases/resources only. Do not migrate live app data here.
- Rolling back scheduler code alone would revive Review deferral; rollback must
  preserve accepted business rules and stop Quartz first.

## Progress

- [x] Product decisions confirmed and source/workflow inspected.
- [x] Five deterministic Vietnam midnight/late-review/day-boundary tests passed.
- [x] Removed Review deferral implementation; added occurrence dispatch with
  source-row locks and transactional notification deduplication. Countdown
  advancement loads and updates alerts while holding the parent lock.
- [x] Persistent scheduler, occurrence jobs and recovery implemented.
- [x] Vietnam UI, configuration and docs integrated.
- [x] Focused tests, build, architecture and isolated runtime checks passed.
- [x] Independent review findings resolved.

## Validation

- Reminder timing/recovery, stale edits, duplicate execution, expired countdown
  and day-boundary tests.
- Frontend Vietnam wall-clock to UTC conversion and date-only preservation.
- Build/test solution and native architecture check; isolated persistent Quartz
  restart proof when prerequisites are available.
- `dotnet test src/backend/FluentA.slnx --configuration Release --no-restore`
  with isolated PostgreSQL on port 15439: Domain 64, Application 171, API 24,
  Infrastructure 22 passed; only two unrelated MinIO tests skipped.
- PostgreSQL proof covers concurrent dispatch, expired/stale reminders, current
  Vietnam-day Habit eligibility, recurrence advancement, and overlapping weekly
  Countdown next-cycle delivery without consuming the current cycle.
- Countdown schedules current and immediate next cycle in advance. When the
  displayed target advances, an already-delivered next-cycle claim is retained.
- Actual composed host proof: two tests passed against isolated PostgreSQL
  (16 seconds): schema provisioning, startup schedule reconstruction, real Todo
  notification/claim, maintenance payloads, implicit/explicit committed changes
  rescheduling, and rollback producing neither trigger nor notification.
- Four composed-host tests passed, including stop/restart before a due instant,
  actual one-time delivery after restart, and preparing the next Countdown
  trigger while the current cycle is already fired. Infrastructure suite:
  26 passed, two unrelated MinIO tests skipped (39 seconds).
- Final integrated rerun `dotnet test src/backend/FluentA.slnx --configuration
  Release --no-build --no-restore` with the isolated database passed: 285 total
  passed across all four test projects; two unrelated MinIO tests skipped.
- The isolated validation container was stopped during a session interruption;
  the first resumed run failed connection. Restarted only that container,
  confirmed readiness and reran the suite successfully. No app database used.
- Both deployment Compose files pass `config --quiet` with validation-only
  placeholder values for required environment variables.
- Frontend build passed (two third-party SignalR annotation warnings). Full
  suite: 156/158 passed, with App Settings heading and Journal calendar lookup
  failures. Both failures reproduced unchanged in a temporary detached worktree
  at HEAD `538d460e88cd68e546d97b2c83a03b6270d49921`, with TZ unset:
  targeted original App/Journal suite 18 passed / 2 failed. The temporary
  worktree and dependency junction were removed without changing the main tree.
- Focused frontend proof passed: Los Angeles timezone/reminder 5 tests;
  Todo/Habit/Countdown/Dashboard/Review 29 tests; Notifications page/sync 4 tests.
  Scoped ESLint and whitespace checks passed.
- Independent read-only backend review found no concrete blocking bugs in
  persistent scheduling, stale-trigger cleanup, deduplication/row locks,
  post-commit signaling, or current/next Countdown recurrence handling.
- After successful backend proof, stopped and removed only the task-owned
  `fluenta-quartz-validation` container and its anonymous test-data volume.
  No application database/container was removed or modified.

## Result

Quartz persistent occurrence scheduling, startup/post-commit/periodic repair,
deduplicated delivery, next-cycle Countdown scheduling, Review deferral removal,
Vietnam UI dates/times and deployment guidance are implemented and validated.
Backend: 285 passed, two unrelated MinIO tests skipped. Frontend build and all
38 focused tests passed; full suite 156/158 with two independently reproduced
baseline failures. Independent backend review found no blocking issues.
No production deployment, application data migration, commit or push performed.
Browser end-to-end acceptance and production-load timing remain unverified;
the runbook states that exact trigger timestamps are not zero-latency guarantees.
