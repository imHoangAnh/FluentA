# US-UI-002 Design

## Recommended Composition

### Public authentication

Keep `AuthShell` separate from protected navigation. Rebuild it with the E27
semantic tokens and Tailwind utilities as a two-panel desktop composition and
a compact tablet composition. The visual language panel is supporting content;
the form panel remains the primary landmark and must preserve tab order and
field labels.

Create or extend only the primitives required by the real flows:

- `Label`, password-aware `Input`, `Button`, and `Card` for form composition;
- semantic inline feedback/alert for success, warning, and error states;
- OTP input composition that remains a normal labeled text input unless a
  segmented control can preserve paste, autofill, and existing behavior;
- skeleton/spinner treatment for the Google callback and pending submissions.

Do not introduce React Hook Form or a validation schema library in this story.
Existing route state and server error mapping remain the behavior boundary.

### Protected learning

Use `AppShell` for `/flashcards`, `/flashcards/practice`, `/review`, the page
viewer, and page Practice route. Extract a presentation-focused focused-session
container for viewer/practice/review content, but keep each route's queries,
mutations, session state, speech APIs, and persistence ordering in its route.

- Flashcard deck selection: board sections and page-deck cards use shared Card,
  Badge, Button, Skeleton, and empty/error feedback.
- Viewer: use a stable card stage, progress indicator, and explicit navigation;
  preserve click/keyboard flip and final actions.
- Practice: use shared selection controls, progress, answer fields, feedback,
  recap, and completion actions; preserve all existing test IDs.
- Review: use Radix-backed Select/Radio Group/Dialog where those interaction
  contracts fit the existing board/mode/resume controls. Resume focus must be
  trapped and returned correctly.

## Component And State Boundaries

- `AppShell` owns navigation, page heading, tablet sidebar, user identity, and
  notification/settings entry points.
- `AuthShell` owns public-page layout only; it does not own auth requests.
- Shared UI primitives own visual variants, focus, disabled state, and ARIA
  behavior, not domain state.
- Route containers retain TanStack Query calls, Zustand auth state, Web Speech
  integration, Practice progression, Review queue logic, and mutation order.
- `LearningNavLinks` is retired from migrated route markup when AppShell is the
  single protected navigation source; it may remain only if an unmigrated route
  still imports it.

## CSS Coexistence And Removal

1. Keep Tailwind Preflight disabled while legacy routes remain.
2. Migrate auth and learning markup without adding new route CSS.
3. Remove inline presentation styles and the embedded AuthShell `<style>`.
4. Remove `DashboardPage.css` imports from migrated learning routes.
5. Delete only legacy selectors proven to have no remaining active consumer;
   leave shared/global cleanup for `US-UI-005`.

## Accessibility And Interaction Contract

- Every field retains a programmatic label, autocomplete/input-mode metadata,
  and visible focus ring.
- Form errors are associated with their field or announced through an
  appropriate live region; pending actions cannot submit twice.
- Radix overlays support Escape, focus trap, focus return, and keyboard choice.
- Flashcard flip remains operable without pointer-only interaction.
- Motion uses the existing short E27 transitions and respects
  `prefers-reduced-motion`.

## Responsive Contract

- Desktop proof: 1440x1000 with expanded AppShell sidebar and balanced auth
  split layout.
- Tablet proof: 1024x900 with collapsed AppShell sidebar and a compact auth
  layout that keeps the form above supporting decoration.
- Learning cards and form panels have bounded readable widths; primary actions
  remain visible without horizontal page scrolling.
- No mobile-specific navigation or quality acceptance is added.

## Rejected Alternatives

1. Preserve the old sidebar inside learning pages: rejected because it forks
   the approved AppShell and active-state behavior.
2. Full-screen learning routes outside AppShell: rejected because D5 requires
   shared protected navigation; focus is achieved inside the content canvas.
3. Rewrite auth validation with a new form framework: rejected because it adds
   behavioral scope unrelated to presentation migration.
4. Redesign Practice/Review rules while restyling: rejected because learning
   and SRS contracts are already shipped and separately proven.
5. Install the full shadcn component catalog: rejected; add only components
   consumed by these routes.

## Expected File Areas

- `src/frontend/src/components/auth/AuthShell.tsx`
- `src/frontend/src/components/auth/TextField.tsx`
- `src/frontend/src/components/AppShell.tsx`
- `src/frontend/src/components/ui/` for the minimum added primitives
- `src/frontend/src/routes/auth/*.tsx`
- `src/frontend/src/routes/flashcards/*.tsx`
- Focused route/component tests and existing auth/learning Playwright specs
- `src/frontend/src/styles.css` and legacy CSS only for proven selector removal
- E27 story validation evidence and affected product-doc presentation notes
