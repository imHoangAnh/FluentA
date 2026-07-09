# Discovery: Settings Route Split

## Source Of Truth

- `SPEC.md` Section 24
- `history/settings-route-split/CONTEXT.md`
- `docs/product/authentication.md`
- `docs/product/learning-workflows.md`
- `docs/ARCHITECTURE.md`

## Architecture Snapshot

- `src/frontend/src/App.tsx` currently registers one protected `/settings`
  route to `SettingsPage`, a separate `/settings/level5` route to
  `LevelFiveSettingsPage`, and a legacy `/settings/review` redirect back to
  `/settings`.
- `src/frontend/src/routes/settings/SettingsPage.tsx` currently combines
  Profile, Practice, and Review in one page.
- Profile already uses explicit save and only uploads avatar assets during the
  profile save action.
- Practice and Review settings currently autosave immediately on edit inside
  `SettingsPage.tsx`.
- `src/frontend/src/routes/settings/LevelFiveSettingsPage.tsx` already proves a
  second-level settings route exists, but it renders outside the main settings
  shell and duplicates header/navigation layout.
- `src/frontend/src/routes/settings/ReviewSettingsPage.tsx` is an older manual
  save surface for Practice and Review settings and appears to be stale.
- `src/frontend/src/lib/api/settings.api.ts` owns aggregate
  `GET /api/v1/settings` and profile save.
- `src/frontend/src/lib/api/flashcard.api.ts` owns the dedicated Practice,
  Review, and Level 5 settings/list endpoints used by the current settings
  flows.

## Current Frontend Surface

| Area | Current files | Current responsibility |
| --- | --- | --- |
| Route registration | `src/frontend/src/App.tsx` | Registers `/settings`, `/settings/level5`, and the legacy `/settings/review` redirect. |
| Shared settings UI | `src/frontend/src/routes/settings/SettingsPage.tsx` | Combined Profile, Practice, and Review page plus autosave logic for Practice/Review. |
| Level 5 route | `src/frontend/src/routes/settings/LevelFiveSettingsPage.tsx` | Global Level 5 list, filters, search, single remove, and bulk remove. |
| Older manual-save reference | `src/frontend/src/routes/settings/ReviewSettingsPage.tsx` | Separate Practice/Review save forms, likely stale. |
| Aggregate settings read | `src/frontend/src/lib/api/settings.api.ts` | Fetches profile plus Practice/Review settings for the unified page. |
| Route test coverage | `src/frontend/src/routes/settings/SettingsPage.test.tsx` | Focused profile-save and avatar-delete regression coverage only. |

## Current Product-Doc Drift

- `docs/product/authentication.md` still describes
  `GET /api/v1/settings` as serving the unified Settings page.
- `docs/product/learning-workflows.md` still says Practice and Review settings
  are edited together from the unified authenticated `/settings` page.
- Feature 24 in `SPEC.md` and `history/settings-route-split/CONTEXT.md`
  supersede those statements and require split second-level routes with manual
  save behavior.

## Target Ownership From Locked Decisions

| Surface | Target behavior | Integration boundary |
| --- | --- | --- |
| `/settings/profile` | Keeps the full profile/avatar flow with explicit save only. | Reads aggregate settings payload and writes through `PUT /api/v1/profile`. |
| `/settings/practice` | Edits only Practice mode inclusion/order with explicit save only. | Reads/writes through Practice settings API and may seed drafts from aggregate settings. |
| `/settings/review` | Edits only `dailyLimit` and `recapAfterAnswer` with explicit save only. | Reads/writes through Review settings API and may seed drafts from aggregate settings. |
| `/settings/level5` | Reuses current Level 5 behavior inside the shared settings shell. | Keeps existing Review Level 5 list/remove APIs and semantics. |
| `/settings` | Redirects to `/settings/profile`. | No content of its own. |

## Primary Risks

- Route split must preserve protected routing and old deep-link behavior while
  adding a new `/settings/profile` default.
- Practice and Review must stop autosaving without losing current validation,
  draft visibility, or cache updates after save.
- Level 5 must move into the shared settings shell without changing its list
  semantics.
- Current docs describe the old unified page, so product truth will drift if
  the feature ships without doc updates.

## Constraints

- Keep backend API contracts stable unless a small compatibility fix is proven
  necessary during validation.
- Do not add mobile-specific settings navigation in this feature.
- Do not add new profile fields, Review settings, Practice settings, or Level 5
  behaviors beyond the locked route/layout/manual-save change.
- Preserve existing logout/header affordances that still matter inside
  Settings.

## Summary

The repo already has the data APIs and one second-level settings route pattern,
but the live frontend is still centered on a single `/settings` page with
Practice/Review autosave. Feature 24 is a standard feature cutover focused on
route layout, draft/save flow ownership, Level 5 shell integration, and
product-doc reconciliation.
