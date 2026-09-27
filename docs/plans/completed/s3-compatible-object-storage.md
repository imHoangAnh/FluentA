# Execution Plan: Provider-Neutral S3-Compatible Object Storage

Date: 2026-08-17

## Status

Completed

## Outcome

FluentA assets use one S3-compatible storage adapter without a MinIO/AWS
provider discriminator. Local Docker uses configured S3-compatible endpoints
and browser-safe HTTPS presigned URLs; production uses AWS S3 regional
endpoints and the default AWS credential chain.

## Context

- Repository owner decision in the task: storage behavior must be configured,
  not selected by provider-specific asset code.
- `README.md`: MinIO remains the local implementation and AWS S3 remains the
  production implementation.
- `src/backend/FluentA.Infrastructure/ObjectStorage/Assets`: current adapter,
  options, startup, and readiness behavior.
- `deploy/local` and `deploy/production`: runtime configuration owners.

## Scope

In scope:

- Remove `AssetStorageProvider` and all MinIO/S3 branching from asset storage.
- Support optional S3-compatible service URL, browser-facing service URL,
  static credentials, region, and path-style addressing.
- Preserve AWS production restrictions outside the provider-neutral adapter.
- Route local presigned PUT/GET traffic through the existing HTTPS Caddy edge.
- Update focused tests and deployment documentation.

Out of scope:

- Changing asset API, database, ownership, lifecycle, or feature contracts.
- Supporting object-storage APIs that are not S3-compatible.
- Changing the production region, bucket, IAM role, or deployment topology.

## Approach

Use one options model and one AWS SDK-based S3-compatible adapter. Build an
operations client from the internal endpoint and a presigning client from the
optional browser endpoint; reuse one client when both endpoints are the same or
when AWS regional endpoint discovery is used. Keep production-only AWS safety
requirements in `ProductionRuntimeValidator`, not in asset behavior.

## Risks And Recovery

- Presigned signatures include scheme, host, port, and path. Local Caddy must
  preserve the original host and request path when proxying to MinIO.
- Removing application-side provider-specific bucket-policy calls shifts
  privacy enforcement to deployment provisioning. Local bootstrap already
  denies anonymous access; production remains responsible for S3 Public Access
  Block and IAM.
- Recovery is a normal revert of this plan's code/config/docs diff; no schema or
  object migration is involved.

## Progress

- [x] Confirm owner authority and current runtime/configuration boundaries.
- [x] Refactor generic options, clients, adapter, startup, and readiness.
- [x] Update local and production Compose/configuration.
- [x] Update tests and evergreen documentation.
- [x] Run focused tests, live local upload proof, and repository checks.

## Decisions

- 2026-08-17: `AssetStorage` has no provider field. A missing custom endpoint
  means the AWS SDK regional endpoint/default credential chain; configured
  endpoints and credentials describe any compatible service.
- 2026-08-17: Local operations and browser presigning may use different network
  endpoints because Docker DNS and browser HTTPS requirements differ.
- 2026-08-17: Asset code verifies bucket accessibility but does not mutate or
  inspect provider-specific bucket policy APIs.

## Validation

- Focused proof: infrastructure 12 passed, API 23 passed; full backend solution
  259 passed with the two opt-in storage integration tests skipped.
- Integration or end-to-end proof: packaged local runtime rebuilt healthy; the
  opt-in HTTPS public-endpoint test passed presign -> PUT -> metadata/prefix ->
  GET -> delete through Caddy and MinIO, leaving zero integration objects.
- Repository-required checks: both Compose configs passed; frontend architecture,
  lint, 150 tests, and production build passed; `git diff --check` passed.

## Result

Assets now use configuration-driven S3-compatible clients without a provider
enum or provider branch. Local Docker and host development expose same-origin
HTTPS presigned URLs through Caddy/Vite while keeping backend operations on the
internal endpoint. Production remains constrained to AWS regional endpoint,
default credentials, and virtual-host addressing. No schema or asset API
contract changed. The local runtime is healthy and the live transfer proof
passed. Existing unrelated Hangfire jobs from the preserved database still
report abstract-type activation failures after the prior backend structure
reorganization; this task did not modify that queue or behavior.
