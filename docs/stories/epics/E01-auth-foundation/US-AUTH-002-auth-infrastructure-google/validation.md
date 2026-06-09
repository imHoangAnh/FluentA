# Validation

## Proof Strategy

The story is done when local services boot with Docker, the EF migration
creates the auth user table, Redis-backed refresh sessions rotate and revoke
correctly, Google auth is covered with deterministic fakes, and the protected
browser/API flow still works with durable storage.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | Duplicate email, password login, invalid login, refresh rotation, Google login creates user, Google login links existing user |
| Integration | Docker Postgres migration applies, API register/login/me/refresh/logout works with Redis |
| E2E | Browser register/login/protected workspace/logout still works |
| Platform | Docker Compose Postgres and Redis health/local connectivity |
| Performance | Not required for this local auth slice |
| Logs/Audit | Existing request log middleware emits auth request lines |

## Fixtures

- `learner@example.com` password account.
- Fake Google subject `google-sub-123` and verified email `google@example.com`.

## Commands

```text
docker compose -f docker-compose.dev.yml up -d
dotnet tool run dotnet-ef database update --project src/backend/FluentA.Infrastructure --startup-project src/backend/FluentA.API
dotnet test src/backend/FluentA.slnx
cd src/frontend && npm run test:run
cd src/frontend && npm run build
cd src/frontend && npm run lint
```

## Acceptance Evidence

- `docker compose -f docker-compose.dev.yml up -d` started healthy Postgres
  and Redis containers.
- `dotnet tool run dotnet-ef database update --project src/backend/FluentA.Infrastructure --startup-project src/backend/FluentA.API` applied `InitialAuthPersistence`.
- `dotnet test src/backend/FluentA.slnx` passed 8 backend tests.
- `cd src/frontend && npm run test:run` passed 3 frontend tests.
- `cd src/frontend && npm run build` passed.
- `cd src/frontend && npm run lint` passed.
- API smoke against Docker Postgres/Redis passed register, login, `/me`,
  refresh rotation, stale refresh rejection, logout, refresh-after-logout
  rejection, and Google-not-configured `501`.
- Browser smoke through the in-app Browser passed register, login, protected
  workspace, and logout redirect. Browser bridge emitted unrelated
  Statsig/Cloudflare telemetry warnings, but local app assertions completed.
