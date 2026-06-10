# Exec Plan

## Goal

Publish authenticated real-time synchronization events after durable commits.

## Scope

In scope:

- Application notifier contract.
- Authorized SignalR hub and user grouping.
- Restricted JWT query-token handling.
- Post-commit notifier calls for word create/update/delete.
- Unit and runtime authorization/event proof.

Out of scope:

- Viewer UI.
- Redis backplane.
- Durable notification retry.

## Risk Classification

Risk flags:

- Auth.
- Authorization.
- Public contracts.
- Existing behavior.
- Weak proof.
- Multi-domain.

Hard gates:

- Auth and authorization.

## Work Phases

1. Add notifier contract and post-commit calls.
2. Add authorized hub and JWT transport configuration.
3. Add tests and runtime client proof.
4. Update Harness evidence.

## Stop Conditions

Pause if query-string tokens cannot be restricted to the hub path or if
notifications must happen before commit.
