# US-ASSET-009 Exec Plan

## Goal

Cut Countdown cover upload/render/delete to feature-owned private delivery.

## Scope

In scope: Countdown validation, DTO/controller/service/repository, frontend API
and page, archive handoff, tests.

Out of scope: new Countdown editing behavior and Restore.

## Risk Classification

Risk flags: authorization, schema, public contract, external storage, existing
delete behavior.

## Work Phases

1. Validate transaction and DTO path.
2. Implement attach/read authorization and private URL generation.
3. Implement detach-to-archive handoff.
4. Update frontend and tests.
5. Run private runtime and cross-user proof.

## Stop Conditions

- List path would introduce an N+1 storage call without a bounded plan.
- Delete and archive cannot commit atomically.

