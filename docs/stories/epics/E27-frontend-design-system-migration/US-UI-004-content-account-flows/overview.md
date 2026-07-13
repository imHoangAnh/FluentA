# US-UI-004 Overview

## Status

implemented and approved

## Lane

high-risk

## Story Outcome

Deliver the fourth E27 approval milestone: Journal, Notes, Notifications, and
Settings use the approved AppShell, semantic tokens, and shared primitives
while preserving their current editor, autosave, upload, inbox, account, and
learning-settings behavior.

## Current Behavior

- Journal duplicates the old dashboard shell and learning navigation, relies
  on legacy global selectors, and contains seven presentation-only inline
  styles. Its list/search/calendar/editor state includes request-version
  guards, an explicit create path, a two-second update autosave, deletion, and
  rich-text image handling.
- Notes duplicates the dashboard shell, imports both `DashboardPage.css` and
  `NotesPage.css`, and presents boards, pages, and the rich-text editor as one
  stateful workspace. It saves on blur and before page switches and uploads
  pasted/dropped images through the shared asset API.
- Notifications uses legacy workspace/dashboard classes and exposes list,
  unread, mark-one-read, and mark-all-read behavior without the shared shell or
  complete loading/empty/error feedback.
- Settings has its own brand header, logout control, and sidebar instead of
  AppShell. Its nested routes manage profile/avatar assets, Practice ordering,
  Review limits, and Level 5 word removal.
- The current frontend baseline is not green: two Notes unit scenarios fail,
  Notes has one `react-hooks/set-state-in-effect` lint finding, and the global
  build/lint also report two unused Dashboard imports outside this story.

## Target Behavior

- `/journal`, `/notes`, `/notifications`, and every `/settings/*` route render
  inside the approved AppShell with correct active navigation and without
  duplicated application navigation.
- Journal retains list, title search, month calendar, explicit creation,
  deletion confirmation, rich-text editing, image paste/drop, and two-second
  autosave for existing entries.
- Notes retains owner-scoped boards/pages, create-board/create-page behavior,
  page switching, save-on-blur/save-before-switch, rich-text editing, durable
  note-image uploads, removed-image cleanup, and clear dirty/saving/error state.
- Notifications presents a durable owner-scoped inbox with readable unread
  state, mark-one/mark-all pending behavior, and consistent loading, empty,
  and error feedback.
- Settings keeps its nested Profile, Practice, Review, and Level 5 navigation;
  profile/avatar lifecycle and all learning-setting mutations retain their
  current query keys, validation, retry, and ownership behavior.
- Desktop Chromium at 1440x1000 and tablet Chromium at 1024x900 remain usable
  without clipped primary actions or unintended page-level horizontal scroll.

## Relevant Product Docs

- `docs/product/journal.md`
- `docs/product/notes.md`
- `docs/product/notifications.md`
- `docs/product/authentication.md`
- `docs/product/assets.md`
- `docs/stories/epics/E27-frontend-design-system-migration/context.md`
- `docs/decisions/0046-frontend-design-system-and-legacy-css-boundary.md`

## Acceptance Criteria

1. Every in-scope route uses AppShell and no longer duplicates the old
   dashboard/workspace/settings navigation.
2. Journal preserves owner-scoped newest-first list, title-only search,
   calendar month/date behavior, populated-date newest selection, unsaved
   empty-date draft behavior, create/update/delete, and request-version guards.
3. Journal preserves the rich-text commands defined by the product contract,
   sanitized persistence, image paste/drop behavior, explicit create, and the
   two-second autosave boundary for existing entries.
4. Notes preserves board/page creation, active selection, page loading, title
   and content editing, save on blur, save before page switch, image upload,
   durable asset references, removed-image cleanup, and owner isolation.
5. The migration does not expose deferred Notes rename/delete, search, tags,
   sharing, templates, or file-picker features.
6. Notifications preserves list order and ownership, unread count refresh,
   mark-one-read, and mark-all-read while adding accessible loading, empty,
   error, and pending feedback.
7. Settings preserves profile name/bio validation, avatar upload/finalize retry
   reuse, saved-avatar listing/deletion/current-avatar synchronization,
   Practice ordering/toggles, Review daily limit, and Level 5 filtering,
   selection, single removal, and bulk removal.
8. Destructive actions use explicit accessible confirmation; all forms expose
   labels, pending/disabled state, validation or server errors, visible focus,
   and keyboard operation without changing mutation ordering.
9. Desktop and tablet Chromium proof covers loading, empty, populated, editor,
   upload, confirmation, unread, and settings subroute states. Mobile-specific
   quality remains out of scope under E27 D6.
10. Existing route URLs, API routes and DTOs, query keys, ownership rules,
    sanitization, asset contracts, and background/realtime behavior do not
    change.
11. Focused unit tests, story-scoped lint, production build, API-backed
    Chromium scenarios, keyboard review, source scans, and deterministic
    screenshots pass or record unrelated pre-existing failures.
12. The two currently failing Notes unit scenarios and the Notes effect-lint
    finding are resolved within this story without weakening behavior
    assertions. Dashboard-only build/lint findings are either reconciled by
    their owning story or carried explicitly into `US-UI-005`.

## Non-Goals

- New journal or notes domain features, new notification delivery channels,
  new settings categories, or changes to editor/storage behavior.
- Board/page rename or delete UI, notes search/tags/sharing/templates, email or
  push notification preferences, or mobile-specific navigation.
- API, DTO, database, authorization, background-job, asset, sanitization, or
  realtime contract changes.
- Initiative-wide deletion of global and route CSS; bounded imports and
  selectors used only by these four migrated areas are removed here, while the
  complete consumer audit and retirement belongs to `US-UI-005`.

## Dependencies And Gate

- E27 decisions D1-D14 and ADR 0046 remain authoritative.
- `US-UI-003` is implemented and provides the approved AppShell and existing
  shared primitive patterns.
- The plan must be approved before any `US-UI-004` source implementation.
- `US-UI-005` cannot begin until the running content/account milestone is
  reviewed and approved.
