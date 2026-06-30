# Overview

## Current Behavior

FluentA currently exposes a dedicated `/settings/review` page that edits
Practice and Review settings with explicit save buttons. Auth profiles expose
only email, full name, and verification status. The app synthesizes avatar
images from `ui-avatars.com` and has no durable bio or backend-mediated avatar
upload flow.

## Target Behavior

FluentA exposes one authenticated `/settings` page with Profile first, then
Practice Settings, then Review Settings. Profile saves full name, optional bio,
and optional avatar through the backend with Cloudinary cleanup semantics.
Practice and Review settings autosave independently while keeping drafts visible
on failure.

## Affected Users

- Authenticated learners.

## Affected Product Docs

- `docs/product/authentication.md`
- `docs/product/flashcards.md`
- `docs/product/learning-workflows.md`

## Non-Goals

- Password/security settings.
- Email change or re-verification.
- Direct browser-to-Cloudinary upload.
- Local avatar fallback storage.
