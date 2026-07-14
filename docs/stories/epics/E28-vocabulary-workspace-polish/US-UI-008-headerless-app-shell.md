# US-UI-008 Headerless AppShell

## Status

implemented

## Lane

normal

## Product Contract

Protected application routes use AppShell without a visible top header. The
route title and description remain screen-reader-only, while route-specific
actions remain available at the top of main content. Notification moves from
the removed header into the sidebar immediately above Settings and opens its
existing preview to the right.

This story supersedes the earlier visible 56 px AppShell header presentation;
it does not change route, notification API, unread-count, or ownership
contracts.

## Acceptance Criteria

- AppShell renders no visible `header` or banner landmark.
- Notification appears immediately before Settings in the sidebar.
- Expanded sidebar shows the Notification label; collapsed/tablet sidebar
  keeps an accessible icon-only trigger.
- The unread badge, scrollable preview, and `/notifications` footer remain.
- Route-specific actions such as Back and Mark all read remain usable.
- Vocabulary and Notes use the newly available full viewport height.

## Validation

- Focused AppShell, Vocabulary, and Notes Vitest: 15/15 passed.
- Frontend lint, production build, and `git diff --check`: passed.
- The production build retains the existing non-fatal SignalR/Rolldown
  pure-comment warnings.
