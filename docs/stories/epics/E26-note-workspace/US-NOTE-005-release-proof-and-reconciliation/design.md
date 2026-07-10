# Design

## Release Boundary

`US-NOTE-005` is a reconciliation story. It does not introduce new product
scope by default; it proves that the shipped Note slices already align across
code, product docs, and durable Harness records.

## Proof Surface

Use the narrowest proof that still covers the real Note lifecycle:

- backend Note and asset tests for sanitization, ownership, and cleanup
- focused frontend Note route and app-route regressions
- API and frontend builds
- one focused browser smoke for protected navigation, Note CRUD, autosave,
  reload-safe content, image upload, and cleanup-relevant behavior

## Runtime Contract

Browser proof should reuse the public authenticated UI and existing Note/API
flows rather than private test seams. If cleanup marking is not directly
visible in UI, the proof may confirm it through durable API or data inspection
that stays inside the shipped contract boundary.

## Documentation And Durable State

`docs/product/notes.md`, story validation evidence, Harness matrix rows, and
the final trace must all describe the same release state. Any drift found
during proof is part of this story.

## Alternatives Considered

1. Mark Feature 25 complete from unit and route tests alone. Rejected because
   the story queue explicitly calls for release proof across navigation,
   persistence, image upload, and lifecycle expectations.
2. Run a broad frontend or backend full-suite regression. Rejected because the
   focused Note release surface is the smallest believable proof.
3. Add debug-only UI to expose cleanup markers. Rejected unless validation
   proves there is no release-safe way to observe the durable behavior.
