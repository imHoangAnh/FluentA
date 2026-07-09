# Overview

## Current Behavior

FluentA still treats `/settings` as the combined settings page. Profile,
Practice, and Review render together in `SettingsPage.tsx`, Level 5 lives on a
separate `/settings/level5` page, and the old `/settings/review` path simply
redirects back to `/settings`.

## Target Behavior

FluentA exposes one shared desktop Settings shell with a fixed sidebar and four
second-level routes: `/settings/profile`, `/settings/review`,
`/settings/practice`, and `/settings/level5`. `/settings` redirects to
`/settings/profile`, all routes remain protected, and Level 5 joins the same
shared shell.

## Affected Users

- Authenticated learners using Settings or Level 5 management.

## Affected Product Docs

- `docs/product/authentication.md`
- `docs/product/learning-workflows.md`

## Non-Goals

- Practice and Review manual-save refactors.
- New settings fields or API behavior.
- Mobile-specific settings navigation.
- Level 5 list/filter/remove behavior changes.
