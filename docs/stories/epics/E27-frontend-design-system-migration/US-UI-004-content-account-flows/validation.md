# US-UI-004 Validation Plan

Date: 2026-07-13

## Status

`PLANNED — IMPLEMENTATION AND ACCEPTANCE PROOF NOT STARTED`

This file records planning readiness and the observed baseline only. It is not
implementation evidence, and no Harness proof flag should be set from it.

## Baseline Evidence

| Check | Result | Planning consequence |
| --- | --- | --- |
| Worktree | clean before planning | Story docs can be reviewed without overlapping source edits. |
| Harness | `US-UI-004` is `planned`, all proof flags `no` | Keep status and proof flags unchanged until implementation evidence exists. |
| Protected routes | Journal, Notes, Notifications, and four nested Settings routes exist | Route URLs are compatibility contracts. |
| AppShell adoption | none of the four route groups uses AppShell | Shell migration is the first visible acceptance boundary. |
| Focused browser coverage | four Journal specs and one Notes spec exist | Notifications, Settings, and responsive milestone proof must be added. |
| Frontend unit suite | 34 passed, 2 Notes tests failed | Resolve within Notes migration without weakening assertions. |
| Frontend lint | Dashboard has two unused imports; Notes has one effect-state error | Notes finding is in scope; Dashboard findings require owner-story reconciliation. |
| Frontend build | blocked by the two Dashboard unused imports | Track as a cross-story prerequisite for final green build. |
| CSS boundary | Notes imports two legacy files; all four groups use legacy shell selectors | Remove only after route-focused proof. |
| Inline styles | Journal has seven presentation rules; editor has computed zoom and hidden input styles | Remove presentation rules; document any computed survivor. |

## Required Proof Matrix

| Layer | Required proof before completion |
| --- | --- |
| Unit | Existing and new route/component tests pass, including Notes empty/create/switch/blur/upload and all Settings mutation tests. |
| Integration | API-backed behavior preserves owner scope, editor persistence, asset lifecycle, notification invalidation, and setting mutations. |
| E2E | Journal, Notes, Notifications, and Settings Chromium scenarios pass with semantic selectors and no weakened assertions. |
| Platform | Production build, lint, desktop/tablet overflow, keyboard/focus, reduced motion, source scans, and screenshots pass. |
| Release | Running milestone is reviewed and approved; docs, validation evidence, and Harness row agree. |

## Required Scenario Inventory

- Journal: empty/populated, explicit create, edit/autosave, delete confirm,
  title search, calendar populated/empty dates, rich-text commands, image
  paste/drop error and persistence.
- Notes: empty board state, create board/page, page loading, save on blur, save
  before switch, refetch without draft loss, image upload/reference cleanup,
  upload error, tablet workspace access.
- Notifications: loading/empty/error, unread emphasis, mark one, mark all,
  pending protection, unread-count refresh, owner isolation through API-backed
  setup.
- Settings: nested navigation, profile validation/save, avatar upload retry
  reuse/list/delete/current synchronization, Practice ordering/toggles, Review
  daily limit, Level 5 search/select/single/bulk removal.
- Cross-route: AppShell active navigation, logout/notification access, 1440 and
  1024 page-level overflow, keyboard focus, and reduced-motion-safe feedback.

## Known Gaps Before Implementation

- The Notes failures must be classified before markup migration so a real state
  bug is not hidden by new selectors.
- No focused Notifications or Settings E2E currently exists.
- `docs/product/assets.md` should be reconciled during documentation review if
  its supported-asset list still omits the shipped `note-image` flow described
  by `docs/product/notes.md`; this does not authorize an API change.
- Full build/lint cannot be accepted while the Dashboard unused imports remain.

## Approval Gate

Implementation may begin only after this packet is approved. Completion
requires fresh evidence for every numeric Harness proof flag; planning and
baseline inspection alone do not qualify.
