# US-LEARN-004 Design

## Backend

- Extend review session creation to distinguish same-day continue vs same-day
  replace vs previous-day replacement.
- Ensure queue selection uses active due words only, sorted by lower level then
  older word creation, with shuffle applied after queue limiting.
- On session completion, defer every still-due active state in the same board
  to tomorrow based on the session business date.
- Add Level 5 query/update endpoints backed by active/inactive review state.

## Frontend

- Review landing page starts with no board selected and shows due-count labels.
- Starting review can open a resume modal instead of launching immediately.
- Review interaction flow becomes graded-answer-first with optional recap only
  after grading.
- Settings gains a second-level Level 5 management route.

## Risks

- Existing review session DTOs may need richer lifecycle metadata.
- Current Review page is still built on an older reveal-first interaction model
  and will need a coordinated rewrite with backend changes.
