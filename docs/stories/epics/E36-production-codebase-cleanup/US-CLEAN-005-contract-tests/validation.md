# US-CLEAN-005 Validation

## Planned Proof

- Full frontend unit suite with the documented deterministic worker settings.
- Playwright cross-feature suite using current HTTPS, auth, API, and selectors.
- Scan for stale endpoint, token-flow, port, and selector strings.

## Evidence

- E2E audit covered all 52 files. The 38 live specs that used the retired
  register/OTP/bearer bootstrap now use
  `src/frontend/e2e/support/auth-fixture.js`; the fixture seeds only the local
  Docker `fluenta_dev` database and adds a signed `access_token` cookie. It
  does not add debug OTP/JWT responses or bearer compatibility to the API.
- Fixed-string scans now return zero live references to `developmentOtp`, the
  removed `accessToken` response, the old API port, or `Authorization: Bearer`
  in `src/frontend/e2e` (the auth contract test mentions `developmentOtp` only
  to assert that it is absent).
- SignalR hook defaults now match the current HTTPS API (`https://localhost:7000`)
  and Playwright configs accept `E2E_BASE_URL` with local certificate errors
  ignored.
- The deterministic frontend unit suite passes serially: 33 files and 137
  tests. The route-manifest/design-system smoke passes all 4 desktop/tablet
  viewport cases after the test fixture rehydrates auth state and the
  supported `/settings/review` redirect was corrected to `/settings/practice`.
- The approved local fixture unblocks cookie-authenticated API/UI smoke. The
  four route/design-system viewport cases and countdown live smoke pass with
  it. The full serial Playwright matrix passes: `83 passed (4.1m)` with one
  worker and no skipped tests.

## Result

Full serial Playwright matrix is green: `83 passed (4.1m)` with one worker;
frontend unit tests are `33 passed / 137 passed`.
