# Exec Plan

## Goal

Deliver the approved My Day core as one end-to-end slice while preserving the
shipped Week planner and leaving Reminder/Repeat to their registered stories.

## Risk Classification

Lane: `high-risk`

Risk flags:

- additive Todo data-model and public DTO change;
- replacement of existing Day presentation and interaction behavior;
- manual reorder interacting with browser-local automatic sorting;
- accessibility and side-by-side responsive proof currently absent;
- overlapping user-owned edits in Todo and product-contract files.

## Implementation Sequence

1. Re-read the dirty diffs for Todo/product files and record the exact protected
   hunks before editing.
2. Add `IsImportant` through domain, application DTO/service, EF mapping, one
   forward migration, snapshot, and focused owner/field-preservation tests.
3. Extend frontend Todo types and mutation helpers without changing the
   existing route family or Week range contract.
4. Extract focused My Day quick-add, row/context-menu, Completed disclosure,
   and detail-panel components; keep route/query orchestration in `TodoPage`.
5. Implement title/note autosave guards, shared importance state, completion,
   confirmed delete, X/Escape behavior, and selection persistence.
6. Implement local automatic sorting and incomplete-only durable manual drag,
   including the automatic-sort-to-manual transition.
7. Move the Week entry into the My Day page-level menu while running the
   existing Week regression unchanged.
8. Update only the Todo section of
   `docs/product/personal-productivity.md`, then capture focused test, migration,
   browser, layout, log, and diff evidence in `validation.md` and Harness.

## Expected Files

Backend:

- `src/backend/FluentA.Domain/Todos/TodoItem.cs`
- `src/backend/FluentA.Application/Todos/*`
- `src/backend/FluentA.Infrastructure/Persistence/Configurations/TodoItemConfiguration.cs`
- `src/backend/FluentA.Infrastructure/Persistence/Migrations/*`
- focused Todo domain/application tests

Frontend:

- `src/frontend/src/features/todo/api/todo.api.ts`
- `src/frontend/src/features/todo/pages/TodoPage.tsx`
- focused components/hooks under `src/frontend/src/features/todo/`
- focused Vitest files and existing/new Todo Playwright specs

Contracts:

- Todo subsection of `docs/product/personal-productivity.md`
- this story packet and Harness row

## Checkpoints

1. **Schema/API:** additive migration and ownership/field-scope tests pass.
2. **My Day behavior:** component tests prove quick add, details, autosave,
   context menu, collapsed Completed, sort, and drag transition.
3. **Compatibility:** focused Chromium proof passes for My Day and the existing
   Week planning regression still passes.
4. **Release hygiene:** product contract, migration state, logs, diff check, and
   protected dirty-file audit are recorded before implementation status changes.

## Rollback Shape

Before release, revert this story's additive migration/code/UI changes as one
unit. After migration deployment, rollback must first remove runtime reads and
writes of `is_important`, then apply an explicitly reviewed compensating
migration; do not edit migration history manually.
