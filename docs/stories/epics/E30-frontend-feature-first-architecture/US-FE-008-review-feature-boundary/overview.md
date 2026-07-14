# US-FE-008 — Review feature boundary

## Objective

Move the Review session route, Review endpoint adapter/types, and focused
tests into `features/review` while preserving `/review` and Dashboard behavior.

## Acceptance criteria

- `/review` is provided by a lazy Review feature route and absent from the
  legacy manifest.
- Review settings, session, answer, summary, and dashboard endpoints have one
  Review owner with unchanged payloads and query keys.
- Dashboard consumes the Review public contract; Review reads Flashcards board
  data through the Flashcards public contract.
- No active legacy Review session/API path remains.

## Out of scope

No backend, API payload, schema, route URL, or UX change is authorized.
