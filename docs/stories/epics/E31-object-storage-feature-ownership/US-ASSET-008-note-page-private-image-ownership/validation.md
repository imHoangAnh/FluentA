# US-ASSET-008 Validation

## Proof Strategy

Prove canonical URL-free Note persistence and feature-owned private rendering.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | sanitizer strips `src`; invalid/base64/external/foreign ids rejected; unique association; removed id archived |
| Integration | association/content transaction; cross-page uniqueness; private presigned hydration; deleted page denial |
| Frontend | paste/drop, save, switch, reload, expired URL refetch, upload failure retains draft |
| E2E | real private image upload, durable reload, remove/save/archive, foreign user `404` |
| Security | stored XSS and IDOR attempts cannot yield a download URL |

## Fixtures

- Two users, two Note pages, valid and foreign Note-image assets.

## Commands

```text
dotnet test src/backend/FluentA.Application.UnitTests/FluentA.Application.UnitTests.csproj
npm --prefix src/frontend run test:run
npm --prefix src/frontend run build
```

## Acceptance Evidence

Pending implementation and runtime proof.

