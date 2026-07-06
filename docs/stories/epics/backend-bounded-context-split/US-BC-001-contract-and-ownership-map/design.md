# Design

## Deliverable

Create `contract-map.md` in this story folder. The map is the implementation
contract for the later split stories.

## Required Map Sections

1. Current-to-target endpoint map.
2. Controller/action map.
3. DTO/request/response ownership map.
4. Application service and port map.
5. Repository method map.
6. Domain entity/value object/scheduler ownership map.
7. EF `DbSet`, configuration, table, index, and foreign-key ownership map.
8. Frontend API client and test call-site map.
9. Vocabulary sync and cleanup dependency map.
10. Migration posture and production/user-data constraints.
11. Later-story implementation order and dependency notes.

## Ownership Rules

| Target context | Owns | Boundary rule |
| --- | --- | --- |
| Flashcard | Page deck/card read model and deck/card sync. | Does not own Practice settings/summaries or Review SRS state. |
| Practice | Practice settings, practice summaries, and Practice workflow persistence. | Calls Review through an application port for Add to Review. |
| Review | Review settings, SRS state/history, scheduler, review sessions, answers, dashboard, and stats. | Owns writes to Review tables and Review dashboard queries. |
| Vocabulary | Vocabulary words/pages/boards as content source of truth. | Emits or dispatches learning sync/cleanup without importing target context internals directly. |

## Evidence Sources

The map must be grounded in current repo evidence from:

- backend controller, application, domain, infrastructure, and EF files
- frontend API client and Playwright/Vitest specs
- current product docs and Feature 20 locked decisions
- Harness matrix/story status for existing Flashcard, Practice, Review, and
  SRS behavior

## Data Model

No data model change is applied in this story. The story only documents target
schema ownership:

- `flashcards.decks`
- `flashcards.cards`
- `practice.settings`
- `practice.session_summaries`
- `review.settings`
- `review.word_states`
- `review.word_histories`

The map must explicitly state whether Feature 20 implementation will start
with a local/dev destructive reset migration and what must be added before any
production/user-data deployment.

## UI / Platform Impact

No user-facing UI changes are shipped in this story. The map must list every
frontend API and test call site that later cutover stories must update.

## Alternatives Considered

1. Start splitting code immediately from `FlashcardService`.
   Rejected because the current service hides API, EF, frontend, dashboard, and
   Vocabulary coupling that must be mapped first.
2. Keep compatibility endpoints while contexts are split.
   Rejected because Feature 20 locks a one-time cutover with old endpoints
   removed in the same feature.
