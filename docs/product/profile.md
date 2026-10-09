# Profile

Accepted direction from the user on 2026-10-09: keep Profile and remove the
separate Settings feature.

- `/profile` is the protected account page. The account link in the sidebar
  opens it; there is no separate Settings navigation item or page.
- The page keeps the existing full name, read-only email, bio, avatar upload
  and removal, and explicit Google account linking flow.
- `GET /api/v1/profile` returns the authenticated user's `UserProfileDto` in
  the standard API response. `PUT /api/v1/profile` updates that profile.
  Google linking stays at `POST /api/v1/auth/link-google`.
- The old `/settings` frontend URL follows the existing unknown-route fallback
  to Overview. The old `/api/v1/settings` endpoint is removed.
- Avatar removal retains its asset row and R2 object under
  [Deletion](deletion.md).
