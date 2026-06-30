# Validation

## Proof Strategy

Prove the auth/profile contract and learning-settings contract separately, then
prove the unified frontend route and shared identity propagation still build and
render correctly.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | Auth profile validation, avatar upload DTO validation, review daily-limit `1-1000`, Practice/Review owner scope |
| Integration | API build, EF migration generation, unified settings read path, profile update multipart handling |
| E2E | Deferred live browser proof for avatar upload/remove and autosave UI flows |
| Platform | Frontend lint, frontend production build, backend project build |
| Performance | No special change beyond existing page and API expectations |
| Logs/Audit | Canonical request logs only; no Cloudinary public id in client DTOs |

## Fixtures

- Auth unit-test users created through existing register/verify/login helpers.
- Fake avatar storage for application-unit coverage.
- Default Practice sequence and Review daily limit of `300`.

## Commands

```text
dotnet build src/backend/FluentA.API/FluentA.API.csproj --no-restore
dotnet test src/backend/FluentA.Application.UnitTests/FluentA.Application.UnitTests.csproj --no-restore
dotnet test src/backend/FluentA.Domain.UnitTests/FluentA.Domain.UnitTests.csproj --no-restore
dotnet tool run dotnet-ef migrations add AddUserProfileSettings --project src/backend/FluentA.Infrastructure --startup-project src/backend/FluentA.API
npm --prefix src/frontend run lint
npm --prefix src/frontend run test:run
npm --prefix src/frontend run build
```

## Acceptance Evidence

- Backend API build passed with 0 warnings/errors after adding profile fields,
  Cloudinary integration, and settings aggregation.
- Application unit tests passed 91 tests; domain unit tests passed 46 tests.
- EF migration `20260629174057_AddUserProfileSettings` was generated
  successfully.
- Frontend lint passed, Vitest passed 21 tests, and production build passed
  with the existing SignalR/Rolldown annotation warnings only.
