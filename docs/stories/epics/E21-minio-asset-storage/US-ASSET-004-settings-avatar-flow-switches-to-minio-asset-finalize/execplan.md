# Execution Plan

## Scope

- Switch `PUT /api/v1/profile` from multipart bytes to JSON
  `{ fullName, bio, removeAvatar, avatarAssetId }`.
- Link finalized owned avatar assets to the profile and retire old owned avatar
  assets on replacement or removal.
- Update the Settings page to upload through presign/finalize only on explicit
  Save profile.
- Add local MinIO browser CORS bootstrap.

## Risks

- Browser direct upload can still fail if MinIO bootstrap misses required CORS.
- Retrying profile save after finalize could create duplicate uploads unless
  the finalized asset id is cached client-side.
- Replacing the current avatar touches both Auth profile state and shared asset
  metadata, so proof must cover both boundaries.

## Proof Targets

- Auth application tests for finalized-asset linking, replacement cleanup, and
  removal cleanup.
- Focused Settings-page test proving upload-on-save and retry reuse.
- Frontend production build.
- Live MinIO/profile smoke proving presign, direct upload, finalize, profile
  save, replacement, removal, and durable metadata state.
