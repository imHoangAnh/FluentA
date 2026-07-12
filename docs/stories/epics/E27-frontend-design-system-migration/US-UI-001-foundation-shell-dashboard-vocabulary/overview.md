# US-UI-001 Overview

## Story Outcome

Deliver the first approved E27 milestone in the running application: the
code-first Foundation, shared desktop/tablet AppShell, redesigned Dashboard,
and redesigned Vocabulary workflow using Tailwind CSS, shadcn/ui, Radix UI,
cva, clsx, tailwind-merge, and self-hosted Geist Sans Variable.

## Current Behavior

- Global and route CSS define overlapping colors, spacing, cards, buttons, and
  navigation styles.
- Protected navigation is repeated across feature routes.
- Dashboard uses route-specific CSS, raw colors, and inline styles.
- Vocabulary is a dense board/page/table workflow with configurable columns,
  cell autosave, keyboard navigation, and multilingual labels.

## Target Behavior

- Dashboard and Vocabulary render inside one shared AppShell with a full
  desktop sidebar and collapsible tablet sidebar.
- Semantic light-theme tokens and Geist typography define the visual language.
- Shared primitives own buttons, inputs, cards, badges, overlays, feedback,
  and variants.
- Dashboard uses comfortable density; Vocabulary uses compact data controls.
- Existing Dashboard data/actions and all Vocabulary behavior remain intact.

## Affected Users

- Authenticated FluentA users on current Chrome or Edge desktop/tablet.

## Affected Product Docs

- Existing Dashboard and Vocabulary contracts under `docs/product/`.
- E27 approved `context.md`.

## Dependencies

- Approved D1-D14 context.
- Existing Dashboard, Vocabulary API, query/mutation, realtime, unit, and E2E
  behavior contracts.

## Non-Goals

- Migrating authentication, learning, productivity, content, or settings
  route bodies beyond the minimum shell compatibility required to keep them
  reachable.
- Mobile-specific UI, dark mode, or non-Chromium remediation.
- API, database, domain, query-key, or realtime contract changes.
- Removing all legacy CSS; final retirement belongs to `US-UI-005`.

