# Overview

## Current Behavior

`/settings/profile` already saves explicitly, but `/settings/practice` and
`/settings/review` still autosave inside their change handlers and still tell
learners that edits are saved automatically.

## Target Behavior

FluentA keeps the split Settings routes from `US-SETTINGS-002`, and Profile,
Practice, and Review all use route-local drafts plus explicit save actions.
Practice and Review edits stay local until the learner clicks Save, then
success/error feedback appears without losing the draft.

## Affected Users

- Authenticated learners editing Practice or Review defaults in Settings.

## Affected Product Docs

- `docs/product/learning-workflows.md`

## Non-Goals

- Route layout or sidebar changes.
- Level 5 behavior changes.
- New Practice or Review fields.
- Mobile-specific settings navigation.
