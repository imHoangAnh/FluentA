# US-FE-007 — Practice feature boundary

## Objective

Move the Practice library and session routes, launch dialog, Practice endpoint
adapter/types, and focused tests into `features/practice`. Keep `/practice` and
`/practice/:pageId` unchanged.

## Acceptance criteria

- The two Practice URLs are supplied by lazy feature route objects through the
  Practice public API; their legacy manifest entries are removed.
- Practice settings, completion-summary, and add-to-review endpoint adapters
  and types have canonical Practice ownership with unchanged payloads.
- The Practice library, launch dialog, and session page have no active legacy
  source paths.
- Practice consumes Flashcard deck and page-session data only through
  `@/features/flashcards`; it does not recreate Flashcard API ownership.
- `deck` and `order` navigation, session/speech behavior, cache keys, and
  responsive deck selection remain unchanged.

## Out of scope

Review routes/endpoints/dashboard belong to US-FE-008. No backend, API
payload, schema, route URL, UX, or cache-behavior change is authorized.
