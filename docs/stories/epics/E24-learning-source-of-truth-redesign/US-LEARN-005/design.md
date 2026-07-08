# US-LEARN-005 Design

## Backend

- Keep the migration chain and compiled test doubles aligned with the latest
  Review and Level 5 contracts so focused proof can run cleanly.
- Use focused static scans to distinguish acceptable historical references from
  stale active-code references that still imply `flashcard_decks`,
  `flashcard_cards`, or page-deck review flows.

## Frontend

- Align active learning E2E files with the page-based Flashcard/Practice and
  board-based Review contracts.
- Treat page-scoped Practice and board-scoped Review as the only valid runtime
  workflows for Feature 23 proof.
- Retire legacy Playwright specs that only validate the removed page-deck
  active-recall and All Words SM-2 models once equivalent active-contract
  coverage exists in the current learning suite.

## Risks

- Cleanup scans will continue to find many historical references in old story
  packets, decisions, and migrations, so the slice must stay disciplined about
  active runtime code versus retained project history.
- Legacy E2E files can silently drift and block future focused proof if they
  keep targeting removed routes.
