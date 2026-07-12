# US-UI-001 Exec Plan

## Goal

Produce the first user-approved E27 milestone without changing product or
backend contracts.

## Risk Classification

Lane: high-risk.

Risk flags:

- broad global CSS interaction;
- protected-route composition change;
- data-dense keyboard/autosave surface;
- visual/test-selector compatibility;
- tablet overflow and bundle growth.

Hard gates:

- validation readiness before implementation;
- production build and focused behavior proof;
- running-app user approval before `US-UI-002`.

## Work Phases

1. Baseline current build/tests, CSS imports, route shell duplication, and
   Dashboard/Vocabulary Chromium behavior.
2. Validate Tailwind/shadcn/React/Vite compatibility and CSS-layer coexistence.
3. Implement foundation and shared primitives.
4. Implement AppShell and route composition.
5. Migrate Dashboard and Vocabulary.
6. Run focused unit, build, Chromium E2E, accessibility, and viewport proof.
7. Present the running milestone for user approval and record evidence.

## Stop Conditions

- A required change reaches API, schema, domain, query-key, or realtime
  contracts.
- Vocabulary autosave or keyboard behavior cannot be preserved.
- Global CSS isolation requires weakening unmigrated routes.
- Validation requirements would need to be reduced.
- The implementation diverges from approved D1-D14.

