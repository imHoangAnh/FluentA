# E27 Frontend Design System Migration Approach

## Recommended Path

E27 shipped as five dependency-ordered, user-visible stories. The temporary
legacy bridge used during milestones has been retired; `design-system.css` is
now the single canonical style entrypoint. Routes, data hooks, API clients, and
domain behavior remain unchanged except for presentation and the restoration
of documented Dashboard widget visibility.

The first story delivers the approved Foundation + AppShell + Dashboard +
Vocabulary milestone as one demonstrable outcome. It establishes the patterns
all later stories must reuse and proves them against both a general dashboard
and FluentA's densest keyboard/autosave surface.

## Why This Path

- A one-shot unreviewed rewrite would combine visual, navigation, table,
  accessibility, and selector failures with no reliable isolation point.
- A route-by-route stack split without shared foundations would preserve the
  current duplication in a different syntax.
- A CSS-only visual reskin would not provide accessible Radix primitives,
  component variants, semantic tokens, or a stable composition model.
- Technical-only setup stories are rejected because they do not produce an
  end-to-end user-observable state.

## Integration Boundaries

- **Composition:** `src/frontend/src/App.tsx`, protected route layout, and the
  new shared AppShell boundary.
- **Design system:** Tailwind entry CSS, semantic tokens, `cn`, cva variants,
  and shadcn/Radix-backed primitives under shared component paths.
- **Feature UI:** route components and feature components may change markup and
  styling but retain their current query/mutation/API contracts.
- **Behavioral safeguards:** Vocabulary autosave, keyboard navigation, column
  configuration, realtime synchronization, editor behavior, and auth guards
  remain owned by existing code and tests.
- **Canonical styling:** Tailwind Preflight, semantic tokens, utilities, and
  the audited semantic component layer are owned by `design-system.css`.

## Expected File Areas

- `src/frontend/package.json` and lockfile.
- Tailwind/Vite configuration and the frontend style entry point.
- `src/frontend/src/lib/utils.ts` or the established shadcn `cn` location.
- Shared UI primitives under `src/frontend/src/components/ui/`.
- Shared shell/navigation components under `src/frontend/src/components/`.
- Route components and their focused tests under `src/frontend/src/routes/`.
- Existing Chromium Playwright scenarios under `src/frontend/e2e/`.
- Product docs affected by materially changed presentation/interaction rules.
- E27 story evidence plus Harness story/trace records.

## Risk And Required Proof

| Risk | Cause and effect | Required proof |
| --- | --- | --- |
| CSS collision | Global selectors can override Tailwind primitives and make migrated routes depend on import order. | Show migrated routes render without legacy selector dependency; scan active imports/selectors before closeout. |
| Behavior regression | Markup changes can break Vocabulary keyboard/autosave and feature mutations even when screens look correct. | Focused Vitest plus existing Chromium E2E behavior scenarios. |
| Navigation regression | Consolidating duplicated navigation changes route composition and active-state behavior. | Authenticated route tests and Chromium navigation proof for every protected route. |
| Accessibility regression | Replacing native or custom controls can lose labels, focus, or keyboard behavior. | Keyboard/focus assertions, semantic component tests, and manual Chromium pass. |
| Tablet overflow | Data-dense routes can exceed the approved tablet canvas. | Chromium checks at the locked tablet and desktop viewports; mobile is non-blocking. |
| Bundle growth | Radix primitives, font assets, and duplicated CSS can increase initial payload. | Compare production build output and record accepted deltas before closeout. |
| Test selector breakage | Tests may target presentation classes that disappear. | Preserve semantic/test contracts where useful; update selectors to role/label/test-id without weakening assertions. |

## Compatibility And Rollback

- Do not remove a route's legacy CSS until its replacement and focused proof
  pass in the same story.
- Keep API DTOs, URLs, query keys, mutation ordering, and realtime hooks stable.
- Each milestone must leave the production build and already-migrated routes
  usable; a failed milestone can be reverted by its bounded source changes
  without database or backend rollback.
- Stop if implementation requires an API/schema/domain change or if an
  existing product behavior cannot be preserved under the approved design.

## Rejected Alternatives

1. **Unreviewed whole-app rewrite:** rejected because it defeats D9 milestone
   approval and makes regression localization impractical.
2. **Permanent CSS/Tailwind coexistence:** rejected because it leaves two
   styling systems and import-order coupling as lasting architecture.
3. **Figma-first workflow:** superseded by approved D8 code-first design.
4. **Mobile-first responsive rebuild:** excluded by D5 and D6.
5. **Replace shadcn/Radix with custom primitives:** rejected because it adds
   accessibility and behavior maintenance without product value.

## Documentation And Decisions

- Keep `context.md` as the approved initiative boundary.
- Update affected `docs/product/` contracts only where a user interaction or
  presentation contract materially changes; do not rewrite domain behavior.
- Add an architecture decision during implementation for the shared frontend
  design-system and legacy CSS retirement boundary.
- Record acceptance evidence in each story packet and reconcile Harness state
  at every milestone.
