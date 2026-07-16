# US-FE-017 Exec Plan

## Goal

Make AppShell a persistent protected route layout while preserving current
route, UI, auth, query, and realtime contracts.

## Scope

In scope:

- Add the AppShell route metadata contract and pathless route layout.
- Nest all protected feature routes under the persistent layout.
- Move static shell props from page wrappers to feature route objects.
- Keep dynamic header actions page-owned at the same visual position.
- Remove page-level AppShell imports/wrappers.
- Add route-transition persistence and manifest coverage.
- Update architecture, product, decision, story, and Harness evidence.

Out of scope:

- AuthShell or protected checking-state redesign.
- Provider, API, schema, cache, realtime event, or feature behavior changes.
- Unrelated user edits already present in the worktree.

## Risk Classification

Risk flags:

- Auth composition.
- Existing protected behavior.
- Public route and UI contracts.
- Multi-domain frontend route manifest.

Hard gates:

- Authentication boundary.
- Architecture direction.

## Work Phases

1. Record baseline route, shell, runtime, and worktree evidence.
2. Add route metadata and the persistent shell layout.
3. Remove page-level shell wrappers without changing feature content.
4. Add state-persistence and route metadata regression coverage.
5. Run focused tests, full Vitest, lint, build, static scans, and diff checks.
6. Reconcile docs, Harness matrix evidence, decision, and trace.

## Stop Conditions

Pause for human confirmation if:

- A protected page requires a different application chrome.
- Preserving presentation requires changing a product workflow.
- Auth, API, query, or realtime behavior must change.
- Validation would require overwriting unrelated user work or weakening proof.

