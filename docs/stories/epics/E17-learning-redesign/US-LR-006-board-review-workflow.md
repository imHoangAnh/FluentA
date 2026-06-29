# US-LR-006 Board Review Workflow

## Status

implemented

## Lane

high-risk

## Product Contract

Review runs on one selected vocabulary board, applies the approved due-word
queue and overflow rules, and persists each answered word immediately using
automatic correct/wrong scoring.

## Relevant Product Docs

- `docs/product/learning-workflows.md`
- `docs/decisions/0034-learning-workflow-redesign-boundary.md`

## Acceptance Criteria

- Review selects one board, one order type, and one review mode per session.
- Queue contains due-today and overdue words only.
- Daily limit defaults to `300 words/day`.
- Overflow keeps the oldest due words in-session and moves the rest to
  tomorrow at session start.
- Correct maps to `Good`, wrong maps to `Again`, and each answer persists
  immediately.

## Design Notes

- Commands: review-session start and review-answer persistence.
- Queries: board due queue and review settings reads.
- API: review settings, review start, and review answers endpoints.
- Tables: dedicated review-state and settings storage.
- Domain rules: Random mode changes mode per word but does not change selected
  word order semantics.
- UI surfaces: review setup, answer flow, recap behavior, settings page.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | overflow, order, and scoring tests |
| Integration | due queue, overflow reschedule, and ownership proof |
| E2E | focused review-workflow spec |
| Platform | backend build + frontend build |
| Release | included in US-LR-007 |

## Harness Delta

- Defines the new board-scoped SRS workflow that replaces All Words review.

## Evidence

- Review settings now model `dailyLimit` plus `recapAfterAnswer`, replacing the
  old new/review-per-day contract in the application, infrastructure, API, and
  protected settings UI.
- The review route now starts from one selected board, requests a board-scoped
  due queue, applies sequential or shuffle order, assigns one review mode per
  session, and submits automatic `correct` / `wrong` answers instead of manual
  SM-2 rating buttons.
- The repository now builds board due queues from dedicated review-state rows
  and pushes overflow due words to tomorrow when the session starts.
- Focused proof passed for the implemented contract:
  - `dotnet build src/backend/FluentA.API/FluentA.API.csproj --no-restore`
  - `dotnet test src/backend/FluentA.Application.UnitTests/FluentA.Application.UnitTests.csproj --filter FlashcardServiceTests`
  - `npm --prefix src/frontend run lint`
  - `npm --prefix src/frontend run test:run`
  - `npm --prefix src/frontend run build`
  - `npm --prefix src/frontend run test:e2e -- review-workflow.spec.js`
- Dedicated proof now covers:
  - due-only queue selection
  - overflow reschedule to tomorrow
  - immediate answer persistence
  - owner/foreign-board isolation
