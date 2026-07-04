# Execution Plan

## Scope

- Remove the dead Cloudinary avatar provider seam from application and
  infrastructure code.
- Remove the transitional `avatar_public_id` domain/model/schema path.
- Update final product/docs/decision/story alignment for Feature 15 and
  Feature 18.
- Re-run focused release proof for the complete local MinIO lifecycle.

## Risks

- The old provider seam may still be referenced indirectly by tests or DI.
- Dropping `avatar_public_id` must not disturb the live MinIO-backed profile
  state that now relies only on `avatar_url` and `current_avatar_asset_id`.
- Historical docs must stay honest about what was previously shipped while not
  looking like active contract anymore.

## Proof Targets

- Focused backend application tests after removing the old provider seam.
- API build after removing the Cloudinary package and generating the cleanup
  migration.
- Frontend focused Settings test and production build.
- EF database update applying the legacy-column removal migration.
- Live MinIO/PostgreSQL smoke proving the full avatar lifecycle still works and
  `information_schema` shows no `avatar_public_id` column on `auth_users`.
