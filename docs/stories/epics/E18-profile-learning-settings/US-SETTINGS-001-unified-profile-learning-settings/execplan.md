# Exec Plan

## Goal

Ship Feature 15 as one vertical slice: unified Settings UI, durable profile
fields, backend-mediated Cloudinary avatar handling, and autosaving Practice
and Review settings.

## Scope

In scope:

- Auth profile schema and DTO expansion.
- Cloudinary avatar upload/delete integration and cleanup semantics.
- Unified `/settings` page and old route redirect.
- Shared avatar propagation across existing authenticated identity surfaces.
- Story, decision, matrix, and trace updates.

Out of scope:

- Password/security settings.
- Email change.
- Avatar crop/edit tools.
- Direct browser upload or alternate storage providers.

## Risk Classification

Risk flags:

- Auth.
- Data model.
- External systems.
- Public contracts.
- Existing behavior.

Hard gates:

- Auth.
- External provider behavior.

## Work Phases

1. Read Feature 15 context, current auth/settings code, and critical patterns.
2. Extend the auth model, profile DTOs, and Cloudinary storage boundary.
3. Add aggregate and profile APIs without breaking existing learning settings
   consumers.
4. Replace the review-only settings page with the unified Settings screen.
5. Run focused backend/frontend validation and generate the migration.
6. Update product docs, decision records, matrix, and trace evidence.

## Stop Conditions

Pause for human confirmation if:

- Product behavior is ambiguous.
- Data migration or deletion risk appears.
- Validation requirements need to be weakened.
- Architecture direction changes.
