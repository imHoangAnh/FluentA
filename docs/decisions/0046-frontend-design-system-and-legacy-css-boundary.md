# 0046 Frontend Design System And Legacy CSS Boundary

Date: 2026-07-13

## Status

Accepted

## Context

FluentA's frontend accumulated a 6,599-line global stylesheet, route-specific
stylesheets, repeated navigation markup, raw color values, and inline
presentation rules. A full frontend redesign is approved, but the migration is
delivered through user-reviewed milestones while unmigrated routes remain
operational.

Tailwind Preflight resets global element behavior. Enabling it while legacy
routes still depend on current element defaults would introduce cross-route
regressions unrelated to the current milestone.

## Decision

- Use Tailwind CSS utilities and semantic CSS variables as the presentation
  foundation.
- Keep shadcn-style components as repository-owned source under
  `src/frontend/src/components/ui`.
- Use focused Radix packages for accessible behavior primitives and cva,
  clsx, plus tailwind-merge for variants/class composition.
- Use self-hosted Geist Sans Variable from the frontend npm bundle.
- Establish one shared AppShell for migrated desktop/tablet routes.
- Omit Tailwind Preflight during legacy CSS coexistence. Scope intentional
  base/reset rules under `.ds-root` so unmigrated routes remain stable.
- Remove each target route's legacy stylesheet dependency when that route is
  migrated and proven. Reconsider a global reset only after all routes are on
  the shared design system.

## Alternatives Considered

1. Enable Preflight immediately: rejected because it changes headings, lists,
   borders, margins, and media across unmigrated routes.
2. Keep plain CSS and only standardize variables: rejected because it retains
   duplicated variants, navigation, and custom accessibility behavior.
3. Install one monolithic UI runtime: rejected in favor of repository-owned
   shadcn components and focused Radix packages.
4. Maintain Tailwind and legacy CSS permanently: rejected because import-order
   coupling would become lasting architecture.

## Consequences

Positive:

- New UI uses semantic tokens, reusable variants, accessible primitives, and
  one consistent desktop/tablet shell.
- Legacy routes remain insulated while migration proceeds.
- Route CSS can be retired incrementally with observable proof.

Tradeoffs:

- The production bundle temporarily contains both legacy CSS and generated
  Tailwind utilities.
- Scoped base rules must be maintained until the final CSS retirement story.
- Each milestone must check for conflicts caused by unlayered legacy selectors.

## Follow-Up

- `US-UI-002` through `US-UI-004` migrate the remaining route groups.
- `US-UI-005` removes superseded CSS, audits inline presentation, and decides
  whether a global reset is safe after full migration.
