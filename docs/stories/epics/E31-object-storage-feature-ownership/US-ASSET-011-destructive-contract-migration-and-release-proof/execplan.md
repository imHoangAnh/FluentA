# US-ASSET-011 Exec Plan

## Goal

Close E31 with the exact destructive, breaking, private-storage release that
was approved.

## Scope

In scope: final EF migration, automatic old-object queue/drain, bucket policy,
legacy code/DTO/config removal, product docs/ADR/matrix, full focused proof.

Out of scope: recovery/backfill, compatibility clients, Restore UI/API, cloud
provider implementations.

## Risk Classification

Risk flags: irreversible data loss, schema migration, external storage,
breaking public API, security, multi-domain, deployment ordering.

Hard gates: data loss, external provider, validation integrity.

## Work Phases

1. Validate migration on seeded legacy DB/bucket and rehearse deployment order.
2. Generate/review final migration and object-deletion queue path.
3. Remove legacy code/contracts/config and anonymous policy.
4. Run backend/frontend/unit/integration/E2E/platform/security proof.
5. Reconcile docs, decision, matrix, validation reports, and trace.

## Stop Conditions

- Seeded old objects cannot be counted and drained deterministically.
- Any legacy URL field or anonymous GET remains.
- Mixed-version deployment is accidentally required.
- Final evidence understates irreversibility or leaves the queue unobserved.

