# Execution Plan

## Scope

- Add shared asset list/delete application and API behavior for owned avatar
  assets.
- Integrate saved-avatar list/delete management into the Settings page.
- Add recurring cleanup for expired pending avatar uploads.
- Update product docs and durable decisions to reflect the new lifecycle.

## Risks

- Deleting the current avatar crosses Auth profile state and shared asset
  metadata, so proof must cover both boundaries together.
- Cleanup can observe already-missing MinIO objects, so the job must treat
  object deletion as best-effort and still retire metadata safely.
- Settings cache updates after current-avatar deletion must clear both the
  saved-assets view and the authenticated profile state without a full refresh.

## Proof Targets

- Asset service unit tests for list mapping, delete-current-avatar behavior,
  and expired pending cleanup.
- Focused Settings-page test proving current-avatar deletion clears cached
  profile state.
- Frontend production build.
- Live MinIO/PostgreSQL smoke proving list counts, current-avatar flags,
  delete-object 404s, profile clearing, and expired pending-upload cleanup.
