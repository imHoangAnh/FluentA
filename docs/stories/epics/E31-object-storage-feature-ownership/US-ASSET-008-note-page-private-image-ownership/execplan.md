# US-ASSET-008 Exec Plan

## Goal

Make private Note images durable, owner-safe, reloadable, and URL-free at rest.

## Scope

In scope: association entity/mapping, Note processing/repository/service/API,
frontend editor/upload integration, tests, migration proof.

Out of scope: other file attachments, cross-page reuse, Restore UI/API.

## Risk Classification

Risk flags: authorization, schema, migration, stored HTML/XSS, existing
autosave behavior, external storage.

## Work Phases

1. Validate canonical stored/rendered HTML and transaction feasibility.
2. Add association model and constraints.
3. Implement save reconciliation and read hydration.
4. Update editor/client behavior.
5. Prove ownership, XSS rejection, reload, removal/archive, and page switching.

## Stop Conditions

- Presigned URLs would be persisted after a save.
- Association reconciliation cannot commit atomically with Note content.
- Hydration weakens current sanitizer or foreign-user non-disclosure.

