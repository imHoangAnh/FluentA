# US-ASSET-007 Exec Plan

## Goal

Prove private provider-neutral object storage end to end through Avatar.

## Scope

In scope:

- Asset model/port/MinIO adapter and shared upload DTO changes.
- Auth avatar feature relationship and download authorization.
- Settings and shared identity frontend cutover.
- Focused tests and disposable PostgreSQL/MinIO runtime proof of the signed
  delivery seam. The shared bucket policy remains unchanged until US-ASSET-011.

Out of scope:

- Notes, Countdown, archive purge, final reset.

## Risk Classification

Risk flags: authorization, data model, external systems, public contracts,
existing behavior, weak integration proof.

Hard gates: external provider behavior, breaking API, schema migration.

## Work Phases

1. Validate schema, AWS SDK/MinIO operations, DTO propagation, and fixtures.
2. Implement provider-neutral domain/application contract and MinIO adapter.
3. Implement Auth-owned avatar attach/download behavior.
4. Cut Settings and identity consumers to ephemeral URLs.
5. Run unit, integration, frontend, browser, security, and diff checks. Prove
   the MinIO signed-GET path without switching the shared bucket policy.
6. Update product docs, story evidence, matrix, and trace.

## Stop Conditions

- Signed GET cannot be proven without a generic authorization bypass.
- Finalize cannot validate a bounded file signature.
- Avatar DTO changes invalidate auth token/session behavior without a scoped
  replacement.
- Migration shape would delete data before the approved final reset story.
