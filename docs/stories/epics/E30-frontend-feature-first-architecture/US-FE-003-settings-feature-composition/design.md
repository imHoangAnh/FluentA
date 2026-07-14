# US-FE-003 Design

## Ownership Shape

```text
app/router.tsx
  -> features/settings (public index)
       -> settings.routes.tsx
       -> pages/SettingsLayout and child pages
       -> api/profile-api and api/avatar-assets
       -> features/practice and features/review public APIs
       -> shared AppShell, UI, HTTP, avatar utilities
```

## Cutover

| Current owner | Action |
| --- | --- |
| `routes/settings/*` | Move Settings route UI to `features/settings/pages`. |
| `lib/api/settings.api.ts` | Split Settings-owned profile adapter into `features/settings/api`; Settings aggregate read remains Settings-owned. |
| `lib/api/assets.api.ts` avatar functions | Move avatar-only adapter to `features/settings/api`; retain shared asset functions for Countdown and Notes. |
| `lib/api/flashcard.api.ts` Practice/Review/Level 5 functions | Expose narrow public adapters from `features/practice` and `features/review`; do not move their routes/UI until their stories. |
| Settings legacy route entry | Replace with `settingsRoutes` and delete it. |
| Settings tests | Move to `src/test/settings`; update mocks to public APIs. |

## Contract Constraints

- Preserve `/settings` redirect to `/settings/profile` and all child paths.
- Preserve query keys: `['settings']`, `['assets', 'avatar']`,
  `['practice', 'settings']`, `['review', 'settings']`, and
  `['review', 'level-five']`.
- Preserve Profile request payload and direct-to-storage avatar sequence.
- Do not create a compatibility barrel or duplicate endpoint client.

## Required Proof

- Focused component tests for profile/avatar, Practice, Review, Level 5, and
  route-manifest composition.
- Authenticated Settings Playwright coverage and direct-route reachability.
- Lint, complete Vitest, production build, old-path/deep-import scans, and
  `git diff --check`.
