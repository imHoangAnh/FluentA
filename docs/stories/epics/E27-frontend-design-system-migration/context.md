# E27 Frontend Design System Migration Context

## Status

- Phase: validation
- Approval: approved
- Intake class: new initiative
- Scope: frontend-only controlled redesign and styling-system migration

## Intent

Replace FluentA's fragmented plain-CSS presentation layer with a coherent,
code-first design system built with Tailwind CSS, shadcn/ui, Radix UI, cva,
clsx, and tailwind-merge. The migration modernizes the visual language and
responsive desktop/tablet experience while preserving product behavior,
routes, data contracts, and backend architecture.

## Existing Behavior And Constraints

- The frontend is a React 19, TypeScript, Vite, and React Router SPA.
- Styling currently includes a 6,599-line global `src/frontend/src/styles.css`,
  route CSS files, repeated raw color values, and inline styles.
- Existing product flows and automated tests cover authentication, dashboard,
  vocabulary, flashcards, practice/review, todos, habits, countdowns, journal,
  notes, Kanban, Pomodoro, notifications, and settings.
- The migration must not change APIs, database schemas, domain behavior, route
  URLs, persistence behavior, or realtime contracts.
- Existing CSS may coexist during implementation, but active legacy CSS and
  inline presentation styles are removed before initiative closeout.

## Locked Decisions

- **D1 — Whole-frontend initiative.** Migrate the entire frontend under one
  initiative rather than limiting the new stack to new pages. Implementation
  may be split into dependency-ordered stories and approval milestones.
- **D2 — Controlled redesign.** Preserve functions and user workflows while
  improving visual hierarchy, layout consistency, interaction quality,
  responsiveness, and accessibility.
- **D3 — Light theme only.** Dark mode, system theme selection, and a theme
  switcher are outside this initiative.
- **D4 — Preserve FluentA teal identity.** Normalize teal as the semantic
  primary color and use semantic tokens for surfaces, text, borders, focus,
  success, warning, and destructive states.
- **D5 — Shared desktop/tablet app shell.** Product routes share an app shell
  with a full desktop sidebar and a collapsible tablet sidebar. Authentication
  routes retain a separate auth shell. No mobile-specific header, drawer, or
  bottom navigation is included.
- **D6 — Small viewports degrade naturally.** Below tablet width the UI must
  not crash, but mobile layout quality is not an acceptance criterion. Do not
  replace the app with an unsupported-viewport screen or impose a global
  minimum width solely to force horizontal scrolling.
- **D7 — Chromium support contract.** Chrome and Edge are the blocking browser
  targets. Firefox and WebKit results do not block this migration.
- **D8 — Code-first design system.** Tokens, components, and screens are
  designed and reviewed in the running application. Figma is not a design
  dependency or approval source for this initiative.
- **D9 — Milestone approval.** Present each implementation milestone in the
  running application for user approval, incorporate feedback, and lock the
  milestone before proceeding.
- **D10 — First milestone.** Build Foundation, AppShell, Dashboard, and
  Vocabulary together to prove both the general visual language and the most
  complex data-dense interaction surface.
- **D11 — Contextual density.** Use comfortable spacing for Dashboard, forms,
  and settings, with compact controls and rows for Vocabulary and other
  data-dense interfaces. Shared components expose intentional size variants.
- **D12 — Purposeful subtle motion.** Use short transitions for interaction,
  sidebar collapse, and Radix overlays; use content skeletons for loading; and
  respect `prefers-reduced-motion`. Decorative page animation is excluded.
- **D13 — Geist Sans Variable.** Use Geist Sans Variable as the single primary
  UI type family, with suitable system fallbacks.
- **D14 — Self-hosted font package.** Deliver Geist through the frontend npm
  dependency/runtime bundle rather than a third-party font CDN.

## Explicit Exclusions

- Mobile-specific design and mobile acceptance testing.
- Dark mode or multiple visual themes.
- Firefox or Safari/WebKit compatibility remediation.
- Backend, API, database, realtime, or domain-contract changes.
- Product feature additions disguised as redesign work.
- Figma mockups, component libraries, or design approval gates.
- A second display font or decorative typography system.

## Approval Milestones

1. Foundation, shared primitives, AppShell, Dashboard, and Vocabulary.
2. Authentication and learning flows: Flashcards, Practice, and Review.
3. Productivity flows: Todo, Habits, Countdowns, Kanban, and Pomodoro.
4. Content and account flows: Journal, Notes, Notifications, and Settings.
5. Legacy CSS removal, Chromium regression proof, documentation, and Harness
   reconciliation.

Milestone boundaries are product-review checkpoints, not permission to leave
the initiative partially migrated at closeout.

## Acceptance Direction

- The approved behavior of every existing route remains available.
- Shared primitives own variants, focus treatment, disabled states, and
  semantic styling rather than route-local duplicated CSS.
- Desktop and tablet layouts are visually coherent and usable in Chromium.
- Keyboard interaction, visible focus, semantic markup, and Radix behavior are
  retained or improved for interactive controls.
- Loading, empty, error, and destructive states use consistent components.
- Active source no longer depends on the legacy route/global styling rules
  superseded by the new design system.
- Relevant unit tests, Chromium Playwright scenarios, lint, type checking, and
  production build pass, with unrelated pre-existing failures reported.

## Deferred To Planning

- Exact Tailwind and shadcn integration versions compatible with the current
  Vite/React toolchain.
- Component inventory and mapping from existing selectors to shared
  primitives.
- Story boundaries, dependency order, CSS coexistence mechanics, and rollback
  checkpoints.
- Visual-regression evidence strategy and any required selector updates.
- Exact desktop and tablet breakpoints within the approved scope.

## Affected Product Contracts

This initiative is intended to preserve the behavior documented across
`docs/product/`. Planning must map every implementation story to the affected
domain contract and update documentation only where the presentation or
interaction contract materially changes.
