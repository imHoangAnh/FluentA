# Execution Plan: FluentA authentication access and refresh tokens

Date: 2026-09-26

## Status

Completed — implementation, compilation and source review on 2026-09-27.

## Outcome

Deliver the agreed authentication API, PostgreSQL schema and web flow: five-minute
JWT access tokens, fixed seven-day refresh tokens, current-login logout revocation,
email OTP and password recovery, and the existing Figma-inspired banner/dialog UI.

## Context

- Authority: user decisions in this conversation through 2026-09-26.
- Follow `AGENTS.md`, `docs/WORKFLOW.md` and `docs/patterns/encoding-invariants.md`.
- Existing sources: backend AuthService/AuthController/User/EfUserRepository;
  frontend auth, landing, shared API, profile/settings and realtime hooks.
- Preserve baseline dirty landing/auth/logo changes and all Harness files.

## Scope

- Add hashed fixed refresh-token records; no session registry or token rotation.
- Rename OTP/reset hash columns, remove OTP attempt/cooldown columns.
- Keep existing IP middleware; user explicitly deferred rate-limit redesign.
- Minimal `/auth/me`; rename Google endpoint; no new profile endpoint.
- Register overwrites unverified email registrations (risk explicitly accepted).
- Auth dialogs and standalone reset page; automatic OTP verification.
- Password reset revokes all refresh tokens; no logout-all endpoint.

## Approach

1. Backend owner implements domain/storage/migration/API and compiles.
2. Frontend owner implements transport/store/dialogs and compiles.
3. Lead documents API/schema/flow, reviews integrated behavior and runs builds.
4. Independent read-only review after stable diffs; resolve findings.

## Risks And Recovery

- Unverified registration overwrite is intentional; verified accounts must never
  be overwritten, including concurrent verification.
- Logout does not invalidate copied access JWTs; they expire in five minutes.
- Existing JWTs minted with seven-day expiry need an explicit rollout strategy;
  changing issuance alone does not shorten existing JWT expiry.
- No migration is applied to user databases by this task. Rename migrations must
  preserve hash data. Removed attempt/cooldown values cannot be restored from a
  down migration; use a database backup for data restoration.
- Existing IP limiter remains; account-scoped OTP throttling is deferred by user.
- No automated tests added/run unless separately requested. Build/static review
  evidence must not be represented as runtime or security test proof.

## Progress

- [x] Read repository instructions and inspect current auth contracts.
- [x] Resolve pending user decisions.
- [x] Implement backend and migration.
- [x] Implement frontend flow and automatic refresh.
- [x] Consolidate product contract and API design in `docs/product/authentication.md`.
- [x] Compile and review integrated change.
- [x] Report proof limits and migration/deployment steps.

## Decisions

- Access JWT: five minutes, no extra expiry skew; fixed refresh: seven days absolute.
- Logout revokes current refresh token only and clears both cookies.
- Reset success revokes every refresh token belonging to that user.
- OTP success returns to banner with exact toast `Register successfully!`.
- No `/registration`: submit edited three-field form through `/register`.
- Rename `/google-login` to `/google`; `/me` returns id, fullName, avatarUrl.
- Password manager autocomplete is independent of login token persistence.
- Profile API expansion, new rate-limiting policy, rotation and logout-all UI/API
  are out of scope.

## Validation

- Source review identified and assigned fixes for stale auth writes from profile
  updates, explicit login after a logout marker, refresh network-error propagation,
  late `/me` responses after logout and OTP input replacement behavior.
- Figma browser connection is unavailable in this session; visual changes use the
  existing workspace styles/assets and earlier inspected design references.
- Backend production build passed on 2026-09-27: `dotnet build
  src/backend/FluentA.API/FluentA.API.csproj --no-restore` (zero warnings/errors).
- Migration `20260926143655_AuthAccessRefresh` preserves existing OTP/reset
  hashes with column renames, removes counters/cooldowns and adds refresh rows.
- Independent source review findings fixed: profile failure no longer deletes an
  existing avatar object; Google subject uniqueness maps to an account conflict;
  automatic auth model-validation errors use the API envelope.
- Full backend solution build passed on 2026-09-27: `dotnet build
  src/backend/FluentA.slnx --no-restore` (zero warnings/errors), including compilation
  of the existing test projects. No test cases were executed.
- Existing backend test cases/doubles were adapted to the accepted interfaces,
  five-minute JWT, OTP replacement and refresh revocation contract; no cases added.
- Final client review addressed logout/login cookie-write ordering and stale
  protected responses. Cross-tab logout uses non-secret markers and clears the
  in-memory marker after another tab establishes a session.
- Frontend `npm run build` passed on 2026-09-27: TypeScript compilation and Vite
  production bundle (3,620 modules). Dependency annotation and plugin timing
  warnings remain; no frontend test cases were executed. Legacy typed fixtures
  were updated for the new auth summary and registration result.
- `git diff --check` passed after integration.
- No user database migration, service startup or outbound email execution.
- Existing automated tests are not executed in this task unless requested.

## Result

Delivered the agreed API, schema migration, refresh transport, banner dialogs,
OTP flow and standalone reset page. Backend and frontend compile; independent
source review findings were addressed. Runtime cookie behavior, mail delivery,
database concurrency, actual migration execution and browser/Figma visual match
remain unverified. Deployment must apply the migration before using the new API;
the product contract documents the command and legacy-JWT cutover.
