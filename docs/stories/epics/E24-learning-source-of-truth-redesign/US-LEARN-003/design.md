# US-LEARN-003 Design

## Backend

- Change Practice-to-Review enrollment from page-wide bulk add to page-owned,
  word-specific enrollment.
- Reuse existing `word_review_states` ownership checks so Practice can only add
  words from the authenticated learner's selected page.
- Treat `practice_session_summaries` as a single durable page marker by
  updating the existing row when the page is finished again.

## Frontend

- Surface practiced state on the Practice entry list only.
- Replace the end-of-session add CTA with recap-time per-word actions.
- Keep Practice non-resumable; leaving the page still restarts from word one.

## Risks

- Inactive re-add still depends on the broader review-state status cleanup.
- Existing E2E expectations will need a follow-up pass once the recap contract
  is fully aligned.
