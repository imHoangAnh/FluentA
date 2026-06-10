# Validation

## Proof Strategy

The story is complete when independent cell saves cannot overwrite unrelated
fields, failed saves preserve their drafts, and dynamic visible cells follow
the locked keyboard contract.

## Test Plan

| Layer | Cases |
| --- | --- |
| Application | Fixed/custom cell keys, validation, ownership, schedule-preserving sync |
| Component | blur/Tab save, Shift+Tab focus, Escape, serialization, failure/Retry |
| E2E | keyboard entry, end-row Enter creation, visible custom cells, injected failure/Retry |
| Regression | Existing vocabulary, flashcard, and review scenarios |

## Acceptance Evidence

- Backend domain/application suites passed 42 tests.
- API build passed with zero warnings and errors.
- Direct concurrent fixed-cell proof preserved `meaning_en` and `note`,
  synchronized both flashcards, and retained interval `11`, ease `2.6`,
  repetitions `4`, and Review state.
- Frontend lint, 13 tests, and production build passed.
- Focused Playwright proof covered Tab, Shift+Tab, Escape, final-cell Enter,
  blank-row Enter creation, injected autosave failure, retained draft, and
  Retry.
- All 7 Playwright regression scenarios passed.
