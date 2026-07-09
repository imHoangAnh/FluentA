# Exec Plan

## Goal

Introduce the shared Settings shell, sidebar, protected second-level route
split, and `/settings` redirect that Feature 24 needs before route-local
manual-save refactors.

## Scope

In scope:

- Shared Settings shell and sidebar extraction.
- `/settings` redirect to `/settings/profile`.
- Protected route registration for profile, review, practice, and Level 5.
- Moving Level 5 under the shared shell.
- Story/docs updates needed to describe the split-route surface.

Out of scope:

- Practice and Review draft/manual-save logic changes.
- Profile save behavior changes.
- Level 5 behavior changes beyond shared-shell rendering.
- Mobile-specific navigation.

## Risk Classification

Risk flags:

- Public contracts.
- Existing behavior.
- Weak proof.

Hard gates:

- None triggered from auth/data/provider categories, but route ownership is
  still user-visible and needs focused proof before execution closeout.

## Work Phases

1. Create the shared Settings shell and sidebar contract.
2. Re-register Settings routes around `/settings/profile`,
   `/settings/review`, `/settings/practice`, and `/settings/level5`.
3. Move existing Settings/Level 5 content into the shared shell.
4. Add focused route proof and refresh product docs to the split-route truth.

## Stop Conditions

Pause for human confirmation if:

- The shell extraction forces an API or state-management change beyond route
  ownership.
- Manual-save refactors become inseparable from the route-shell cutover.
- Validation requirements need to be weakened.
