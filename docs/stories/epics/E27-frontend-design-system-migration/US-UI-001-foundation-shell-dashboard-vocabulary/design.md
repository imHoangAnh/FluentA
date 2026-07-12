# US-UI-001 Design

## Planned Shape

1. Add the approved frontend dependencies and Vite-compatible Tailwind setup.
2. Define light semantic tokens and Geist Sans Variable at the style entry.
3. Add `cn` and cva-backed shared primitives, importing only shadcn/Radix
   components used by this milestone.
4. Extract a protected AppShell that owns sidebar structure, active navigation,
   content canvas, and tablet collapse state.
5. Compose Dashboard from shared primitives while preserving its data hooks and
   actions.
6. Compose Vocabulary board/page/table/configuration UI from shared primitives
   while preserving keyboard, autosave, multilingual, and preference behavior.
7. Remove Dashboard/Vocabulary legacy CSS only after focused proof passes.

## Component Boundary

- Primitives remain presentation-focused and composable.
- AppShell owns application navigation/layout, not feature data.
- Route containers retain queries, mutations, derived state, and feature error
  handling.
- Vocabulary table logic remains separate from generic table primitives; do
  not abstract domain behavior into the design system.

## CSS Coexistence

- Tailwind and tokens enter through the existing global style entry.
- Unmigrated routes may continue consuming legacy selectors temporarily.
- New primitives use semantic utilities/tokens and must not reference legacy
  route class names.
- Avoid global element rules that change unmigrated form/table behavior.

## Responsive Contract

- Desktop proves the full sidebar and normal content canvas.
- Tablet proves the collapsed sidebar and usable Dashboard/Vocabulary content.
- Below tablet width must not crash, but layout quality is non-blocking.

## Alternatives Considered

1. Keep duplicated navigation until final closeout: rejected because AppShell is
   an approved first-milestone outcome and later routes need one stable shell.
2. Replace Vocabulary behavior during redesign: rejected because D2 preserves
   product workflows and would mix visual migration with feature work.
3. Install the complete shadcn catalog: rejected; only used source components
   should enter the repository.

