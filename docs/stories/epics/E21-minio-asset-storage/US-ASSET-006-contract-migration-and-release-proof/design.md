# Design

## Runtime Cleanup

Remove the old Cloudinary-specific avatar seam entirely:

- delete the unused `IAvatarStorage` application port
- delete the unused `CloudinaryAvatarStorage` infrastructure adapter
- remove the `CloudinaryDotNet` package reference
- remove dead auth error/DTO/exception types that existed only for the old
  backend-mediated provider upload path

## Profile Model Cleanup

The shipped runtime keeps:

- `auth_users.avatar_url`
- `auth_users.current_avatar_asset_id`

The shipped runtime removes:

- `auth_users.avatar_public_id`

`User.UpdateProfile(...)` now models only current-avatar URL plus current asset
linkage. No provider-specific identifier remains in the domain model.

## Schema Cleanup

Add one EF Core migration to drop `auth_users.avatar_public_id` from local
PostgreSQL after the MinIO lifecycle is already live.

## Contract Cleanup

- Feature 15 docs remain historically relevant for the unified Settings page
  but must no longer imply active multipart Cloudinary upload.
- Decision `0035` remains historical context but is explicitly superseded by
  the MinIO cutover and final cleanup decisions.
- Release proof records both behavior evidence and the schema-removal check.

## Alternatives Considered

1. Keep `avatar_public_id` as an unused compatibility column indefinitely.
   Rejected because Feature 18 explicitly removes Cloudinary from the shipped
   avatar flow, so keeping a dead provider field would preserve misleading
   contract surface and runtime baggage.
2. Rewrite or delete older Feature 15 story artifacts entirely.
   Rejected because historical evidence still matters; targeted superseded
   notes are enough to prevent contradiction without erasing prior delivery
   context.
