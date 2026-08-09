# US-CLEAN-006 Validation

## Planned Proof

- npm and NuGet direct/transitive package audit.
- Config/DI/job/export reference scan and secret/config hygiene scan.
- Backend Release build/test, frontend lint/test/build, Playwright, EF baseline,
  OpenAPI consumer diff, runtime smoke/log review, and `git diff --check`.

## Evidence

- Frontend release checks pass after the cleanup/config changes:
  `npm run lint` (zero ESLint diagnostics), `npm run test:run --
  --maxWorkers=1` (33 files, 137 tests), and `npm run build` (success). Build
  output contains only the known third-party Rolldown `@microsoft/signalr`
  pure-annotation warnings.
- Backend release checks pass: `dotnet build src/backend/FluentA.slnx
  --configuration Release --no-restore --nologo` (0 warnings, 0 errors),
  Domain tests 62/62, Application tests 147/147, and
  `dotnet ef migrations has-pending-model-changes` reports no model changes.
- NuGet vulnerability scan reports no vulnerable packages in the solution.
  The frontend dependency audit is also clean after refreshing the test-only
  `jsdom@29.1.1` resolution to `undici@7.29.0`: `npm audit` reports zero
  vulnerabilities for the full dependency tree.
- The local/dev database was explicitly verified as `fluenta_dev` on the
  Docker `fluenta-postgres` container, reset, and rebuilt from
  `20260809101816_InitialBaseline`. Schema inspection found 28 application
  tables, one history row, no `restored_at_utc`, no
  `legacy_asset_deletion_queue`, and no flashcard legacy tables. Local rows
  were intentionally reset under the approved scope; no production database
  was targeted.
- `git diff --check` passes. Full authenticated Playwright proof remains
  unavailable because the current auth contract intentionally exposes neither
  OTPs nor bearer tokens and no external mailbox/test-host fixture is supplied.
- A fresh Release API instance was started on `https://localhost:7001` from
  the current binary. Its OpenAPI document exposes
  `/api/v1/boards/{boardId}/pages` with `POST` only; probing the removed `GET`
  method returns `405 Method Not Allowed`. A `404` is not the correct probe for
  this method because the same route remains supported for page creation.
  Runtime request logging is active and startup confirms private MinIO bucket
  privacy. The stale Development MinIO credentials were aligned with
  `docker-compose.dev.yml`, and the EF collection comparer was added for
  `PracticeSettings.ModeSequence`; a repeat startup/probe emitted no first-
  party warning.
- Final fixed-string scans report zero references to the six deleted dialogs,
  removed asset exports, `ListPagesAsync`, the exact removed `AssetStatus`
  aliases, or `RestoredAtUtc`/`restored_at_utc`; all five SignalR defaults use
  the current HTTPS API base. The remaining 38 E2E files containing
  `developmentOtp`/`accessToken` are the documented CLEAN-005 auth migration
  blocker, not unreviewed dead production code.

## Release Gate

This story remains open until CLEAN-005 has a safe live-auth fixture and the
full Playwright matrix, OpenAPI consumer diff, authenticated API smoke, and
runtime log review are executed. No deployment or provider setup is included
in E36; handoff is to E34 after that evidence exists.
