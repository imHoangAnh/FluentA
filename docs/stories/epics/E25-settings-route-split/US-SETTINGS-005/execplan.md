# Exec Plan

## Goal

Deliver the approved four-surface Settings workspace redesign without changing
FluentA's existing Settings routes, API contracts, save semantics, or Level 5
history behavior.

## Work Phases

1. Baseline the current focused Settings tests and confirm the required shared
   primitives/dependencies exist.
2. Redesign `SettingsLayout` and Profile while preserving route and avatar-save
   behavior.
3. Redesign Practice and Review while preserving their explicit-save drafts,
   guards, cache updates, and error recovery.
4. Redesign Level 5 with search-first controls, one filter dropdown, semantic
   table selection, visible-active select-all, and confirmation Alert Dialog.
5. Update focused tests and relevant product docs.
6. Run focused Vitest, targeted lint, production build, responsive browser
   proof when feasible, scoped diff review, Harness evidence, and trace.

## Expected Source Files

- `src/frontend/src/features/settings/pages/SettingsLayout.tsx`
- `src/frontend/src/features/settings/pages/SettingsPage.tsx`
- `src/frontend/src/features/settings/pages/SettingsPracticePage.tsx`
- `src/frontend/src/features/settings/pages/SettingsReviewPage.tsx`
- `src/frontend/src/features/settings/pages/LevelFiveSettingsPage.tsx`
- optional small components under `src/frontend/src/features/settings/components/`
- focused tests under `src/frontend/src/test/settings/`
- `src/frontend/src/test/app/App.test.tsx` only if visible layout/navigation
  assertions need reconciliation

## Validation Commands

```powershell
npm --prefix src/frontend run test:run -- src/test/app/App.test.tsx src/test/settings/SettingsPage.test.tsx src/test/settings/SettingsPracticePage.test.tsx src/test/settings/SettingsReviewPage.test.tsx src/test/settings/LevelFiveSettingsPage.test.tsx
npm --prefix src/frontend exec eslint -- src/features/settings src/test/settings src/test/app/App.test.tsx
npm --prefix src/frontend run build
git diff --check -- docs/product/authentication.md docs/product/learning-workflows.md docs/stories/epics/E25-settings-route-split src/frontend/src/features/settings src/frontend/src/test/settings src/frontend/src/test/app/App.test.tsx
```

Browser proof should cover the four Settings routes, Level 5 selection and
confirmation, and widths 320, 768, 1024, and 1440 when a local runtime is
available.

## Stop Conditions

Pause and request direction if implementation would require:

- a new API, DTO, route, schema, or dependency;
- a different Level 5 retention/state transition;
- overwriting the existing dirty `design-system.css` changes;
- expanding into unrelated AppShell or learning workflow redesign.

## Approval Gate

Source implementation begins only after this plan and its readiness validation
are explicitly approved.
