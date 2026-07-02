# Exec Plan

## Goal

Finish Feature 16 so the code, product docs, Harness matrix, and focused
validation all describe the same FluentA SRS behavior.

## Scope

In scope:

- Active, owner-scoped SRS state reads.
- Practice `Finish` versus `Add to Review`.
- Review correct/wrong transitions and history.
- Early/non-due rejection.
- Route/API wording in docs and tests.
- Harness story, decision, and trace updates.

Out of scope:

- Legacy SM-2 history preservation.
- Full redesign of old Playwright specs outside the focused Feature 16 proof.
- Removing inert legacy card scheduling columns.

## Risk Classification

Risk flags:

- Data model migration.
- Public API and route contract.
- Cross-workflow learning behavior.
- Dashboard metric interpretation.
- Existing dirty UI route changes in the worktree.

Hard gates:

- Do not revert unrelated dirty files.
- Do not weaken the locked Feature 16 context.
- Verify focused backend and frontend tests before marking stories
  implemented.

## Work Phases

1. Discovery against locked context, product docs, matrix, and current code.
2. Register `US-SRS-*` Harness rows.
3. Patch owner/deleted-state filters and stale route/API documentation.
4. Update focused Practice and Review Playwright specs.
5. Run targeted backend/frontend proof.
6. Record Harness evidence and trace.

## Stop Conditions

Pause for human confirmation if:

- The implementation would need to preserve old SM-2 review history.
- A destructive migration must be regenerated against a live shared database.
- The dirty UI redesign conflicts with Feature 16 behavior.
- Required proof cannot run because local services are unavailable.
