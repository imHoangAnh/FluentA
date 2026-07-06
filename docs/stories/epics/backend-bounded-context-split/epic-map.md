# Feature 20 Backend Bounded Context Split

Source of truth:

- `SPEC.md` Section 20
- `history/backend-bounded-context-split/CONTEXT.md`
- `docs/stories/epics/backend-bounded-context-split/discovery.md`
- `docs/stories/epics/backend-bounded-context-split/approach.md`

## Mode

`high_risk_feature`

This is high risk because it changes architecture boundaries, public API
contracts, database schema ownership, migration strategy, frontend calls, and
release proof for shipped learning workflows.

## Outcome

Split the current mixed Flashcards backend into three internal bounded
contexts inside the same modular monolith:

- Flashcard owns page deck/card read models and deck/card sync.
- Practice owns practice settings, practice summaries, and practice workflow
  persistence.
- Review owns SRS state/history, Review settings, scheduling, Review sessions,
  review answers, dashboard, and learning stats.

## Epic Map

| Story | Title | Outcome | Main proof |
| --- | --- | --- | --- |
| `US-BC-001` | Contract and ownership map | Complete current-to-target map for endpoints, DTOs, services, repositories, domain entities, EF tables, migrations, frontend calls, tests, and Vocabulary sync. | Approved story packet and static evidence from current code. |
| `US-BC-002` | Domain and application boundary split | Flashcard, Practice, and Review domain/application contracts exist under separate bounded contexts without behavior changes. | Backend compile plus focused domain/application tests. |
| `US-BC-003` | Repository and EF context split | Infrastructure repositories and EF configurations are context-owned and no longer funnel through one mixed Flashcard repository. | Backend integration tests and architecture scan. |
| `US-BC-004` | PostgreSQL schema ownership | Learning tables move to `flashcards`, `practice`, and `review` schemas with approved dev reset or preserve-data path. | Migration script/model snapshot review and backend tests. |
| `US-BC-005` | API controller cutover | `FlashcardsController`, `PracticeController`, and `ReviewController` expose only context-aligned routes and remove legacy mixed routes. | API tests and route scan proving old endpoints are unreachable. |
| `US-BC-006` | Frontend endpoint cutover | Frontend API clients, settings, dashboard, routes, Vitest, and Playwright specs use the new endpoint families. | Frontend lint, Vitest, build, and focused Playwright. |
| `US-BC-007` | Vocabulary sync and cleanup split | Vocabulary sync emits/dispatches context-owned work: Flashcard syncs decks/cards and Review cleans SRS state/history. | Integration proof for create/update/delete and owner/deleted-row behavior. |
| `US-BC-008` | Release proof | End-to-end proof covers Flashcard viewer, Practice, Add to Review, Review, dashboard/stats, settings, schema boundaries, and endpoint removal. | Full targeted verification ladder and Harness story verification. |

## Current Story To Prepare After Approval

`US-BC-001` should be prepared first.

Acceptance shape:

- Documents every current backend endpoint and target owner.
- Documents every current DTO/application method/repository method and target
  owner.
- Documents every current domain entity/value object/scheduler type and target
  owner.
- Documents every EF table/configuration/index and target schema.
- Documents frontend API/test call sites that must change during cutover.
- Documents Vocabulary sync and cleanup coupling that must be replaced.
- Chooses migration posture for the dev implementation and states the
  production/user-data requirement.
- Produces an implementation order that keeps each later story small enough to
  review.

## Execution Gate

Do not create implementation beads or move source code until this epic map is
approved and `US-BC-001` is prepared/validated. The first implementation pass
should only begin after the current-to-target contract map is accepted.

## Release Gate

Feature 20 is not releasable until all of the following are true:

- No controller route keeps the removed legacy mixed endpoint shape.
- No frontend API client or Playwright/Vitest spec depends on removed legacy
  endpoints.
- Practice creates Review enrollment only through a Review application port.
- Review is the only writer/owner for SRS state, SRS history, scheduling,
  Review settings, and dashboard/stats.
- Vocabulary create/update/delete still syncs Flashcard cards and cleans
  Review state/history with owner scoping and deleted-row behavior preserved.
- EF mappings put target tables under the approved PostgreSQL schemas.
- The selected migration posture is explicit and safe for the target
  deployment environment.
