# Exec Plan: US-TRASH-001

## Goal

Prove that one central Trash registry can coordinate an owner-scoped Todo
aggregate through move, Undo/Restore, manual hard delete, and scheduled purge
without bypassing recurrence or reminder rules.

## Scope

In scope:

- Proposed `trash_entries` schema and controlled entity kind.
- Trash application/API contracts and Todo participant.
- Existing Todo DELETE compatibility.
- Reminder removal, recurrence-chain grouping, original date/order restore.
- `/trash` protected route, initial list, sidebar entry, individual actions,
  and Todo Undo toast.
- Claim-safe scheduled purge foundation.
- No-backfill migration behavior for pre-E35 deleted Todo rows.

Out of scope:

- Other E35 feature participants.
- Bulk actions and Empty Trash, completed in US-TRASH-006.
- Final coordinated release.

## Risk Classification

Risk flags:

- Data model and migration.
- Data retention and irreversible deletion.
- Authorization and non-disclosing ownership.
- Public API/client-visible Delete behavior.
- Existing Todo recurrence/reminder behavior.
- Cross-layer and multi-domain foundation.

Hard gates:

- Data loss/migration.
- Authorization.

Lane: `high-risk`.

## Work Phases

1. Validate current recurrence links, reminder storage, FK delete behavior,
   transaction seams, and cleanup-job runtime.
2. Validate the registry/participant alternative and claim protocol with live
   PostgreSQL before accepting decision 0055.
3. Implement domain/application/persistence/API Todo vertical slice.
4. Implement protected `/trash`, navigation, Undo, and focused cache behavior.
5. Prove owner/foreign paths, concurrency, migration partitioning, recurrence,
   reminders, responsive UI, and worker registration.
6. Update product docs, decision status, story proof, and Harness state.

## Stop Conditions

Pause for human confirmation if:

- The current Todo relation cannot identify future occurrences without
  changing the approved recurrence contract.
- Registry and Todo writes cannot share one atomic transaction.
- The purge claim needs a provider or distributed lock not already approved.
- Preserving active rows requires a destructive database reset.
- Existing DELETE response compatibility cannot be retained.
- Validation requirements need to be weakened.
