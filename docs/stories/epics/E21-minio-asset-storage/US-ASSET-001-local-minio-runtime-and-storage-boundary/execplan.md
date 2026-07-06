# Exec Plan

## Goal

Establish the real local MinIO runtime and reusable backend storage boundary
that all later Feature 18 asset stories depend on.

## Scope

In scope:

- MinIO service in `docker-compose.dev.yml`
- default development bucket/bootstrap path
- backend storage-provider seam for presign/metadata/public-url/delete
- safe local configuration shape and startup guidance
- story and validation evidence

Out of scope:

- asset metadata persistence
- presign/finalize/list/delete product API
- avatar Settings UI migration
- Cloudinary removal from the active avatar flow
- production/staging provider decisions

## Risk Classification

Risk flags:

- External systems.
- Public contracts.
- Existing behavior.
- Weak proof.

Hard gates:

- External provider behavior.

Lane: high-risk.

## Work Phases

1. Confirm the current Docker/runtime and backend storage baseline.
2. Add local MinIO service plus bucket/bootstrap path.
3. Add the reusable backend storage-provider seam and config binding.
4. Run compose/build/runtime proof.
5. Record validation evidence and update Harness state.

## Stop Conditions

Pause for human confirmation if:

- local MinIO requires a different workflow than repo-root Docker Compose
- runtime proof depends on tracking unsafe secrets
- the first story needs asset metadata or UI changes to be believable
- validation expectations need to be weakened
