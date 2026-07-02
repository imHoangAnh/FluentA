# E19 FluentA SRS Algorithm

Source of truth:

- `history/fluenta-srs-algorithm/CONTEXT.md`
- `SPEC.md` Section 16
- `docs/product/flashcards.md`
- `docs/product/learning-workflows.md`
- `docs/decisions/0036-fluenta-srs-review-boundary.md`

## Stories

| Story | Title | Contract |
| --- | --- | --- |
| `US-SRS-001` | Replace SM-2 state with FluentA SRS state and review history schema | `word_review_states` stores owner, word, level, due date, lapse count, and last reviewed timestamp; `word_review_histories` stores correct/wrong level snapshots. |
| `US-SRS-002` | Deterministic FluentA SRS scheduler | Correct advances levels `0-5`; wrong schedules tomorrow and increments lapse count only above Level 0. |
| `US-SRS-003` | Practice Finish/Add to Review behavior | `Finish` persists summary only; `Add to Review` creates only missing Level 0 state rows due tomorrow. |
| `US-SRS-004` | Review answer persistence and history | Review uses due word state, applies FluentA SRS, and writes one history row per answer. |
| `US-SRS-005` | Early/non-due review rejection | Missing, foreign, deleted, or non-due review-state updates are rejected. |
| `US-SRS-006` | Practice, Review, settings, and dashboard regression | Focused backend/frontend proof covers the Feature 16 release path. |

## Validation Ladder

1. Domain tests for every FluentA SRS transition and validation boundary.
2. Application tests for authenticated request validation and settings access.
3. Frontend route/API tests for `/review`, Practice, dashboard, and settings.
4. Focused Playwright for Practice `Finish` versus `Add to Review`.
5. Focused Playwright for Review due queue, overflow, correct/wrong updates,
   early rejection, and owner isolation.
