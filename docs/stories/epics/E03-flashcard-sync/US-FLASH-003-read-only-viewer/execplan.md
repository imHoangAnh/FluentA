# Exec Plan

## Goal

Make synchronized cards visible in a protected read-only viewer.

## Work Phases

1. Add owner-scoped flashcard read application/infrastructure/API boundary.
2. Add protected viewer route, navigation, grouped card UI, and empty states.
3. Connect SignalR invalidation and prove live refresh under three seconds.
4. Run regression gates and update Harness evidence.

## Stop Conditions

Pause if the read model cannot enforce ownership or if live refresh requires
review-session behavior outside this story.
