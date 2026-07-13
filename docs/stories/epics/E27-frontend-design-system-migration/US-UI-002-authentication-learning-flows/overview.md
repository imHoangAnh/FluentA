# US-UI-002 Overview

## Status

planned

## Lane

high-risk

## Story Outcome

Deliver the second E27 approval milestone: all public authentication routes
and the protected Flashcard, Practice, and Review workflows use the approved
Geist/teal design system, shared primitives, and desktop/tablet composition
without changing authentication, learning, SRS, API, or route behavior.

## Current Behavior

- Authentication routes share `AuthShell`, but it embeds a large `<style>`
  block, raw colors, inline presentation styles, and an Inter font override.
- Auth feedback uses repeated `form-note`, `form-error`, and legacy button
  classes; password and OTP flows rely on accessible labels that existing E2E
  helpers consume.
- `FlashcardsPage` and `ReviewSessionPage` duplicate the old dashboard sidebar
  and import legacy Dashboard CSS instead of using `AppShell`.
- `FlashcardViewerPage` and `PracticeSessionPage` use separate legacy workspace
  markup and button/input classes.
- Existing behavior tests cover protected learning navigation, viewer flip and
  paging, Practice mode progression and completion actions, Review queue and
  resume behavior, OTP verification, and password recovery contracts.

## Target Behavior

- Login, Register, Verify Email, Forgot Password, Reset Password, and Google
  callback use one responsive desktop/tablet `AuthShell` built from semantic
  tokens and shared form primitives.
- Flashcard deck selection, viewer, Practice, and Review use the approved
  `AppShell`; focused sessions keep a distraction-light content surface inside
  that shell rather than creating another navigation system.
- Loading, empty, error, progress, resume, answer, recap, and completion states
  use shared primitives and consistent semantic feedback.
- Existing route URLs, accessible names, test IDs, query/mutation ordering,
  browser speech behavior, and learning state transitions remain unchanged.

## Relevant Product Docs

- `docs/product/authentication.md`
- `docs/product/flashcards.md`
- `docs/product/learning-workflows.md`
- `docs/stories/epics/E27-frontend-design-system-migration/context.md`

## Acceptance Criteria

1. All six public auth routes render in the redesigned AuthShell at the locked
   desktop and tablet viewports, with labeled fields, visible focus, disabled
   submission states, and semantic success/error feedback.
2. Registration still requires OTP verification before password login;
   resend/cooldown, invalid/expired OTP, forgot-password, reset-token, Google
   callback, and logout/redirect behavior are preserved.
3. Protected navigation exposes separate Flashcard, Practice, and Review
   entries through the shared AppShell with correct active states.
4. Flashcard boards/pages, empty/error/loading states, card flip, previous/next,
   Finish, and `Let's practice` preserve the current workflow.
5. Practice preserves page-deck selection, Sequential/Shuffle order, configured
   modes, speech unsupported state, answer/reveal/recap progression, Finish,
   and Add to Review behavior.
6. Review preserves board selection, mode/order selection, due queue, resume
   dialog, immediate answer persistence, recap setting, and completion state.
7. Desktop Chromium at 1440x1000 and tablet Chromium at 1024x900 are usable
   without clipped primary actions or unintended horizontal page overflow.
   Mobile-specific quality remains out of scope.
8. Migrated source no longer depends on auth/flashcard/review presentation
   selectors from legacy CSS or duplicated dashboard/workspace navigation.
9. Focused Vitest, authentication and learning Playwright scenarios, targeted
   lint, production build, keyboard review, and milestone screenshots pass or
   have unrelated pre-existing failures explicitly recorded.

## Non-Goals

- Changing auth APIs, cookies/tokens, email delivery, OAuth configuration,
  backend validation, database schema, or security rules.
- Changing Page Deck ownership, Practice modes, Review limits, FluentA SRS
  transitions, query keys, realtime behavior, or speech-recognition rules.
- Migrating Settings Practice/Review pages; those remain in `US-UI-004`.
- Mobile layouts, dark mode, Firefox/WebKit remediation, or decorative motion.
- Removing all global legacy CSS; initiative-wide retirement is `US-UI-005`.

## Dependencies And Gate

- E27 decisions D1-D14 remain locked.
- `US-UI-001` running milestone is visually approved.
- Planning approval and high-risk validation are required before source
  implementation begins.
