# 0035 Profile Learning Settings And Avatar Storage

Date: 2026-06-30

## Status

Accepted

## Context

Feature 15 adds one authenticated Settings page that crosses auth profile data,
learning settings, and a third-party avatar provider. The implementation needs
to preserve the existing auth boundary, keep Practice and Review settings
user-scoped, and avoid leaking Cloudinary identifiers or weakening failure
semantics around avatar replacement and cleanup.

## Decision

FluentA keeps profile ownership in the Auth bounded context and reuses the
existing flashcard settings storage for Practice and Review. The frontend reads
one aggregate `GET /api/v1/settings` payload for page hydration, saves profile
changes through `PUT /api/v1/profile`, and autosaves Practice and Review
through dedicated `/api/v1/practice/settings` and `/api/v1/review/settings`
endpoints.

Avatar uploads stay backend-mediated. The API accepts multipart form data,
validates MIME type and size before storage, uploads to Cloudinary, stores only
`avatarUrl` in public DTOs, and keeps `avatarPublicId` internal for cleanup.
Profile saves do not autosave. Practice and Review settings do autosave.

## Alternatives Considered

1. Direct browser-to-Cloudinary upload. Rejected because it complicates the
   explicit save semantics, exposes more provider detail to the client, and
   makes rollback/cleanup harder to centralize.
2. Separate Practice and Review settings pages. Rejected because Feature 15
   locks one unified Settings page with Profile first.
3. Local filesystem avatar fallback. Rejected because the product rules require
   real Cloudinary behavior with no local fallback path.

## Consequences

Positive:

- Auth remains the source of truth for durable identity fields.
- Learning settings reuse the existing validated persistence path.
- Avatar cleanup and Cloudinary secret handling stay on the server boundary.
- The authenticated UI can refresh one profile shape across current surfaces.

Tradeoffs:

- The backend now owns a Cloudinary integration and secret dependency.
- Avatar removal needs rollback handling when external deletion fails after the
  database update path begins.
- The Settings screen coordinates three save behaviors instead of one.

## Follow-Up

- Add focused E2E coverage for real profile/avatar flows once Cloudinary test
  credentials are available in the validation environment.
- Revisit shared avatar UI components if more profile surfaces are added later.
