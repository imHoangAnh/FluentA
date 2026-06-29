# US-LR-005 Practice Batch Completion

## Status

implemented

## Lane

high-risk

## Product Contract

Practice reuses Feature 13 interactions, adds global mode-sequence settings and
order selection, and batch-creates or resets review state only when the full
page-deck session finishes.

## Relevant Product Docs

- `docs/product/learning-workflows.md`
- `docs/stories/epics/E17-learning-redesign/context.md`

## Acceptance Criteria

- Practice selects Board -> Page Deck, then `Sequential` or `Shuffle`.
- Practice mode sequence is global, unique, non-empty, and defaults to
  Dictation -> Meaning -> Word -> Pronunciation.
- Each word completes the configured modes, then recap, before advancing.
- Wrong answers stay on the current step until correct or skip/reveal.
- Full session completion creates or resets review state for all practiced
  words; abandonment persists nothing.

## Design Notes

- Commands: practice-session completion batch write and settings update.
- Queries: page-deck selection tree and practice settings reads.
- API: practice settings and practice completion endpoints.
- Tables: practice settings and review-state lifecycle support.
- Domain rules: recap is always last and not configurable.
- UI surfaces: practice selection, practice session, settings UI.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | sequence validation and batch persistence tests |
| Integration | abandoned-session and ownership proof |
| E2E | focused practice-workflow spec |
| Platform | frontend build + backend build |
| Release | included in US-LR-007 |

## Harness Delta

- Replaces Feature 13 summary-only persistence with the approved learning-state
  completion contract.

## Evidence

- Practice settings are now stored separately from review settings through
  `practice_settings`, `GET/PUT /api/v1/flashcards/practice-settings`, and the
  protected settings page.
- The practice route now runs a global mode sequence plus mandatory recap for
  each page-deck word and only persists review-state resets through the
  completion endpoint.
- Focused proof passed for the implemented contract:
  - `dotnet build src/backend/FluentA.API/FluentA.API.csproj --no-restore`
  - `dotnet test src/backend/FluentA.Application.UnitTests/FluentA.Application.UnitTests.csproj --filter FlashcardServiceTests`
  - `npm --prefix src/frontend run lint`
  - `npm --prefix src/frontend run test:run`
  - `npm --prefix src/frontend run build`
  - `npm --prefix src/frontend run test:e2e -- practice-workflow.spec.js`
- Dedicated proof now covers:
  - global sequence settings persistence
  - Board -> Page Deck practice entry
  - sequential and shuffle start options
  - abandoned-session no-op persistence
  - full-session review-state creation/reset only at completion
