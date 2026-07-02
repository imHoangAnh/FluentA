# E20 Database Performance Optimization

Source of truth:

- `SPEC.md` Section 17
- `docs/product/database-performance.md`
- `docs/product/flashcards.md`
- `docs/product/learning-workflows.md`
- `docs/ARCHITECTURE.md`
- Supabase/Postgres best-practice skill references for query indexes,
  partial indexes, FK indexes, pg_stat_statements, EXPLAIN, data access, and
  connection management.

## Stories

| Story | Title | Contract |
| --- | --- | --- |
| `US-DBOPT-001` | PostgreSQL performance baseline | Saved script/report captures pg_stat_statements availability, index inventory, FK-index audit, connection state, stats freshness, and representative EXPLAIN plans. |
| `US-DBOPT-002` | Review dashboard index refinement | Active review dashboard queries use partial indexes that match owner/date/session plus `deleted_at IS NULL`. |
| `US-DBOPT-003` | Productivity and workspace index pass | Pending measured pass for Todo, Habit, Countdown, Notification, Journal, Kanban, Pomodoro, and Vocabulary workspace paths. |
| `US-DBOPT-004` | EF dashboard query rewrite | Flashcard dashboard aggregation stays server-side and avoids materializing growing card/state/history sets. |
| `US-DBOPT-005` | Connection budget | Local API and Hangfire Postgres connection usage is explicit, bounded, and configurable. |
| `US-DBOPT-006` | Release proof | Pending full release comparison after representative workload and pg_stat_statements are available. |

## Validation Ladder

1. Apply EF migrations against local PostgreSQL.
2. Run the baseline collector and save the report artifact.
3. Confirm missing FK-index audit has no target-table gaps.
4. Confirm review partial indexes exist after migration.
5. Run focused backend tests and API build.
6. Run frontend route tests/build if user-visible dashboard behavior could
   regress.
7. Update Harness matrix rows and trace evidence.
