# US-LR-004 Read-Only Flashcard Viewer

## Status

implemented

## Lane

high-risk

## Product Contract

Flashcard becomes a read-only page-deck viewer with one-card navigation and a
final `Let's practice` redirect into the Practice workflow.

## Relevant Product Docs

- `docs/product/learning-workflows.md`
- `docs/stories/epics/E17-learning-redesign/context.md`

## Acceptance Criteria

- Flashcard list shows page decks grouped by board/page without inline word
  expansion.
- Selecting a deck opens a one-card viewer.
- The viewer supports click-to-flip and manual Next/Previous controls.
- Final actions are `Finish` and `Let's practice`.

## Design Notes

- Commands: none.
- Queries: existing owned deck/card read, reshaped for viewer needs.
- API: page-deck card reads only.
- Tables: none.
- Domain rules: Flashcard is read-only and does not mutate review state.
- UI surfaces: flashcard routes, route state, and card viewer UI.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | `npm --prefix src/frontend run test:run` |
| Integration | owner-scoped deck/card read proof |
| E2E | focused flashcard-viewer spec |
| Platform | `npm --prefix src/frontend run build` |
| Release | included in US-LR-007 |

## Harness Delta

- Replaces the old mixed deck page expectations with a viewer-only contract.

## Evidence

- `npm --prefix src/frontend run test:run` passed with the dedicated viewer
  route covered in `App.test.tsx`.
- `npm --prefix src/frontend run build` passed.
- `npm --prefix src/frontend run test:e2e -- flashcard-viewer.spec.js` passed,
  proving protected access, owner-scoped page-deck visibility, one-card viewer
  navigation, click-to-flip behavior, final `Let's practice` redirect, and
  live SignalR refresh after vocabulary mutations.
