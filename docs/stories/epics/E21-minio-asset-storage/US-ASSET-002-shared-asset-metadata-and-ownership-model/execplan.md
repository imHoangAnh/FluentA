# Exec Plan

## Goal

Introduce the durable shared asset metadata and current-avatar ownership model
that later Feature 18 presign/finalize/delete stories will build on.

## Scope

In scope:

- shared asset domain entity and enums
- user-owned asset metadata persistence
- nullable current-avatar asset link on `auth_users`
- migration and snapshot updates
- product/decision/story evidence for the new ownership model

Out of scope:

- presign/finalize/list/delete routes
- frontend Settings upload flow rewrite
- MinIO metadata verification logic
- expired pending-upload cleanup job behavior
- Cloudinary removal from the active profile flow

## Risk Classification

Risk flags:

- Data model.
- External systems.
- Existing behavior.
- Public contracts.
- Weak proof.

Hard gates:

- Data model.
- External provider behavior.

Lane: high-risk.

## Work Phases

1. Confirm the locked Feature 18 ownership rules and current auth/avatar model.
2. Write the current story packet and decision for the shared asset foundation.
3. Add the asset domain, persistence mapping, and user linkage.
4. Generate or manually complete migration proof if tooling is constrained.
5. Run focused verification and record the constrained or passing results.
6. Update Harness state, matrix evidence, and trace.

## Stop Conditions

Pause for human confirmation if:

- the current avatar link needs a broader auth-contract rewrite than planned
- safe coexistence with the live Cloudinary flow is not believable
- migration proof requires weakening the schema contract
- the story expands into API or frontend behavior to remain coherent
