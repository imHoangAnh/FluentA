# Exec Plan

## Goal

Introduce the shared authenticated asset API that later Settings/avatar work
will call for presigned direct upload and finalize verification.

## Scope

In scope:

- shared asset presign endpoint
- shared asset finalize endpoint
- application service, DTOs, and error contract
- pending-row creation and MinIO metadata verification
- focused runtime proof against local MinIO

Out of scope:

- Settings-page cutover
- current-avatar linkage or profile propagation
- old-asset replacement and delete semantics
- list/delete endpoints
- cleanup-job behavior

## Risk Classification

Risk flags:

- External systems.
- Public contracts.
- Existing behavior.
- Weak proof.

Hard gates:

- External provider behavior.
- Public API shape.

Lane: high-risk.

## Work Phases

1. Confirm the shared API contract against the existing auth/avatar flow.
2. Add the asset service, DTOs, error handling, and controller routes.
3. Add focused unit coverage for presign/finalize behavior.
4. Run build and local runtime/API proof against MinIO.
5. Update product docs, decision record, story evidence, and Harness state.

## Stop Conditions

Pause for human confirmation if:

- finalize must update the current profile avatar in this story to remain coherent
- the shared route shape conflicts with locked Feature 18 decisions
- MinIO metadata verification is insufficient without adding cleanup or delete behavior
- validation would need to drop the real direct-upload smoke
