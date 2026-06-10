# Validation

## Proof Strategy

Prove unverified users cannot log in, registration sends through the email sender boundary, verification marks the profile verified, and all existing E2E flows still work after deterministic verification.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | Password users start unverified; registration sends a verification message; login rejects unverified accounts; verification enables login; invalid token rejected. |
| Integration | API build and backend solution tests compile endpoint/service contracts and the AWS SES sender implementation. |
| E2E | Register through UI, fail login before verification, verify token through API, login succeeds. |
| Platform | Full Playwright suite with every registration flow verifying before login. |

## Commands

```text
dotnet test src/backend/FluentA.slnx --no-restore
dotnet build src/backend/FluentA.API/FluentA.API.csproj --no-restore
npm run lint
npm run test:run
npm run build
npx playwright test e2e/auth-email-verification.spec.js --workers=1
npx playwright test --workers=1
```

## Acceptance Evidence

- `dotnet test src/backend/FluentA.slnx --no-restore`: passed, 50 tests.
- `dotnet build src/backend/FluentA.API/FluentA.API.csproj --no-restore`: passed, 0 warnings/errors.
- `npm run lint` using Node 24.15.0: passed.
- `npm run test:run` using Node 24.15.0: passed, 18 frontend tests.
- `npm run build` using Node 24.15.0: passed; only known third-party SignalR pure-annotation warnings from Rolldown.
- `npx playwright test e2e/auth-email-verification.spec.js --workers=1`: passed.
- `npx playwright test --workers=1`: passed, 10 E2E scenarios.
