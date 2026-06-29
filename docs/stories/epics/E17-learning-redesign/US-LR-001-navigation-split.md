# US-LR-001 Navigation Split

## Status

implemented

## Lane

high-risk

## Product Contract

Protected navigation exposes separate `Flashcard`, `Practice`, and `Review`
entries so learners stop entering the redesign through one mixed flashcard
surface.

## Relevant Product Docs

- `docs/product/learning-workflows.md`
- `docs/stories/epics/E17-learning-redesign/context.md`

## Acceptance Criteria

- Protected navigation exposes distinct `Flashcard`, `Practice`, and `Review`
  menu items.
- Labels use `Practice`, not `Learn`.
- Navigation no longer implies that the old `/flashcards` route is the single
  review engine.

## Design Notes

- Commands: route and nav composition only.
- Queries: none beyond existing protected-shell queries.
- API: none.
- Tables: none.
- Domain rules: naming and route boundaries must match the approved contract.
- UI surfaces: app shell, dashboard CTA, route entry points.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | `npm --prefix src/frontend run test:run` |
| Integration | n/a |
| E2E | focused navigation and route smoke |
| Platform | `npm --prefix src/frontend run build` |
| Release | included in US-LR-007 |

## Harness Delta

- Adds the first explicit story row for the learning-surface split.

## Evidence

- Protected navigation now exposes separate `Flashcard`, `Practice`, and
  `Review` entries through a shared learning-nav component reused across the
  protected shell pages.
- `/flashcards/practice` is now a dedicated practice landing route, so the old
  `/flashcards` route no longer acts like the single mixed learning engine.
- Focused proof passed:
  - `npm --prefix src/frontend run test:run`
  - `npm --prefix src/frontend run build`
  - `npm --prefix src/frontend run test:e2e -- learning-navigation.spec.js`
