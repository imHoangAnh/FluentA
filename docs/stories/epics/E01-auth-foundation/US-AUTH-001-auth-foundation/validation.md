# Validation

## Proof Strategy

The story is done only when backend, frontend, and end-to-end auth behavior are proven with real commands. Tests should cover the auth contract, security-sensitive token behavior, and the browser-visible login/register/protected-shell flow.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | User creation rules, password validation, password hashing abstraction, token generation/parsing, refresh-session revocation rules. |
| Integration | Register, duplicate register, login success/failure, refresh success/failure, logout revocation, `/me` authorized/unauthorized, standard response envelopes. |
| E2E | Register or login through React UI, land in protected app shell, refresh access, logout, protected shell no longer visible. |
| Platform | Local backend and frontend dev servers run on documented ports. |
| Performance | Basic smoke only for this story; no p95 performance claim until load test tooling exists. |
| Logs/Audit | Confirm auth logs do not include passwords, access tokens, or refresh tokens. |

## Fixtures

- Test user email: `learner@example.com`
- Test full name: `FluentA Learner`
- Test password: `SecurePass123`
- Duplicate email fixture for conflict behavior.
- Invalid credential fixture for `INVALID_CREDENTIALS`.

## Commands

Execution must make these commands real or update this section with equivalent commands before closing the story.

```text
dotnet test src/backend/FluentA.slnx
cd src/frontend && npm run test:run
cd src/frontend && npm run build
browser/API smoke: run backend and frontend locally, then verify register, login, /me, refresh, logout, and protected-route redirect behavior
```

## Acceptance Evidence

- `dotnet test src/backend/FluentA.slnx` passed: Domain tests 2/2, Application tests 4/4.
- `cd src/frontend && npm run test:run` passed: 1 test file, 3/3 tests.
- `cd src/frontend && npm run build` passed with Vite production build.
- API smoke passed with real cookie session: register, login, `/me`, refresh, logout, and refresh-after-logout rejection.
- Browser smoke passed through register, login, protected workspace, and logout redirect.
- Visual QA artifacts: `.agent-workflow/screenshots/auth-concept.png`, `.agent-workflow/screenshots/login-desktop.png`, `.agent-workflow/screenshots/login-mobile.png`.
