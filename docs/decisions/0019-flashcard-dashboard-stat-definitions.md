# 0019 Flashcard Dashboard Stat Definitions

## Status

Accepted

## Context

SPEC.md requires the Flash Card Dashboard to show streak, retention rate, and a forecast chart. Those product words need stable definitions so backend queries, frontend labels, and tests agree.

## Decision

Dashboard stats are computed on demand from existing active flashcard cards, decks, boards, and review records.

- Streak counts consecutive learner-local days with at least one `CardReview`, ending today if there is activity today or yesterday if today has no activity yet.
- Retention rate is the percentage of reviews rated Good or Easy.
- Due counts and forecast use All Words cards only, avoiding double-counting Page Deck duplicates.
- Forecast returns seven learner-local calendar days starting today.
- Dashboard endpoints require a valid browser timezone ID.

## Consequences

- No migration is required for the MVP dashboard.
- Dashboard numbers stay consistent with review history immediately after review submissions.
- If analytics volume grows, this read model can later be backed by summary tables without changing the visible product definitions.
