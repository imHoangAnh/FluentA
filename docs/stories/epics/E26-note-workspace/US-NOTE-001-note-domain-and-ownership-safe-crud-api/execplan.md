# Exec Plan

## Goal

Introduce the durable Note board/page backend contract that later Note
workspace, editor, and image-upload stories will build on.

## Scope

In scope:

- Note domain entities and validation rules
- owner-scoped Note repository and application service seam
- Note CRUD API routes
- board-to-page soft-delete cascade
- EF mappings, migrations, and product/story evidence for the new backend
  contract

Out of scope:

- `/notes` frontend route and workspace shell
- Journal editor reuse, blur autosave, or page-switch save flow
- paste/drop image upload and removed-image cleanup
- search, tags, sharing, templates, and cross-feature links

## Risk Classification

Risk flags:

- Data model.
- Public contracts.
- Existing behavior.
- Weak proof.

Hard gates:

- Data model.

Lane: high-risk.

## Work Phases

1. Confirm the locked Note context and approved E26 story order.
2. Add the Note story packet and durable Harness row.
3. Add Note domain, application, persistence, and API seams.
4. Generate migration/build proof and focused backend tests.
5. Refresh product docs and matrix evidence for `US-NOTE-001`.
6. Record trace and validation outcome.

## Stop Conditions

Pause for human confirmation if:

- the Note contract requires a broader architecture change than the approved
  E26 map
- the board-delete cascade is not believable without hidden cross-context work
- migration or API proof requires weakening the Note ownership contract
- the story expands into UI/editor/upload behavior to remain coherent
