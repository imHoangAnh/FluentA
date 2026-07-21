# Exec Plan

## Goal

Deliver the approved fixed Repeat choices and safe occurrence lifecycle as one
owner-scoped vertical slice after `US-TODO-003`, without adding Reminder or
Week v2 behavior.

## Risk Classification

Lane: `high-risk`

Risk flags:

- additive Todo schema and public DTO changes;
- completion now creates data and must be concurrency-safe;
- reopen can delete one system-generated child;
- month-end, weekday, and leap-year transitions are non-linear;
- the shared Todo details and tests already contain shipped My Day behavior.

## Implementation Sequence

1. Add the exact domain enum and table-driven next-date calculator tests.
2. Add recurrence and lineage state to `TodoItem`, including explicit pristine
   transitions for material user edits.
3. Extend create/update/read DTOs additively with nullable `repeatPattern` and a
   nullable mutation-only warning code.
4. Add a repository completion-lifecycle operation using one transaction,
   owner-scoped row lock, active-child lookup, and one save/commit.
5. Configure the self-lineage relation and filtered unique active-child index;
   scaffold one forward EF migration after `AddTodoImportance`.
6. Extend service tests for enum validation, copied fields, idempotency,
   pristine rollback, edited-child retention warning, deletion isolation, and
   foreign-owner nondisclosure.
7. Add the Repeat selector to `TodoDetailsPanel`, preserve title/note/star/
   completion behavior, and map the warning code to visible feedback.
8. Update Todo product documentation, then capture migration, unit, live API,
   Chromium, concurrency, log, and repository-hygiene evidence.

## Expected Files

- Todo domain enum/entity and domain tests.
- Todo DTO/service/repository contracts, EF repository/configuration, focused
  application tests, one generated migration and model snapshot.
- Todo frontend API type, detail panel/page feedback, component tests, and Todo
  E2E recurrence coverage.
- Todo subsection of `docs/product/personal-productivity.md`, this story packet,
  and Harness evidence.

## Checkpoints

1. **Domain:** every approved calendar transition passes table tests.
2. **Atomic data behavior:** concurrent/retried completion yields one child;
   reopen behavior follows pristine state exactly.
3. **UI/API:** the panel exposes only approved choices, can clear Repeat, and
   shows the edited-child warning without closing.
4. **Compatibility:** My Day and existing Week behavior remain green; Reminder,
   Duplicate, and Week v2 remain untouched.

## Rollback Shape

Before deployment, revert this story as one unit. After migration deployment,
first deploy code that no longer reads or writes recurrence columns, then apply
an explicitly reviewed compensating migration. Never edit migration history or
delete existing Todo rows manually.
