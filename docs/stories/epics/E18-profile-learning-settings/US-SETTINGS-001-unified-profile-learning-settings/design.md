# Design

## Domain Model

`Auth.User` now owns `Bio`, `AvatarUrl`, and internal `AvatarPublicId` in
addition to `FullName` and email verification state. Practice and Review
settings stay in their existing user-owned tables. Review daily limits now
validate `1-1000` instead of allowing zero.

## Application Flow

`AuthService.UpdateProfileAsync` validates profile fields and avatar metadata,
uploads a new avatar through `IAvatarStorage` when needed, updates the user
record, removes old avatars after successful replacement, and rolls the profile
back when an avatar-removal delete fails. `SettingsController` aggregates Auth
plus Flashcard settings reads for the unified page.

## Interface Contract

- `GET /api/v1/settings` returns `{ profile, practiceSettings, reviewSettings }`
  for the authenticated user.
- `PUT /api/v1/profile` accepts multipart form data with `fullName`, `bio`,
  `removeAvatar`, and optional `avatar`.
- `GET/PUT /api/v1/practice/settings` and `GET/PUT /api/v1/review/settings`
  serve autosave flows and preserve the existing frontend session consumers.
- Public profile DTOs return `avatarUrl` only. Cloudinary `publicId` remains
  internal.

## Data Model

Migration `20260629174057_AddUserProfileSettings` adds `bio`, `avatar_url`, and
`avatar_public_id` to `auth_users`. No new settings tables are created. The
existing `practice_settings` and `review_settings` tables remain lazily
defaulted per user.

## UI / Platform Impact

The frontend replaces `/settings/review` with `/settings` and redirects the old
route. The unified page keeps Profile explicit-save, Practice autosave, and
Review autosave. Existing dashboard/sidebar identity surfaces now prefer the
saved avatar URL before falling back to generated initials.

## Observability

The feature relies on existing canonical request logs. Cloudinary identifiers
remain server-only and are not emitted to client payloads.

## Alternatives Considered

1. Rewriting Practice/Review pages to consume only the aggregate endpoint.
   Rejected because the existing dedicated settings endpoints already power live
   session consumers and remain useful as stable feature APIs.
