# US-ASSET-008 Validation

## Proof Strategy

Prove canonical URL-free Note persistence and feature-owned private rendering.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | sanitizer strips `src`; invalid/base64/foreign ids rejected; unique association; detached assets remain ready until archive lifecycle |
| Integration | association/content transaction; cross-page uniqueness; signed hydration; deleted page denial |
| Frontend | paste/drop, save, switch, reload, expired URL refetch, upload failure retains draft |
| E2E | real image upload, signed delivery after reload, remove/save detaches association, foreign user `404` |
| Security | stored XSS and IDOR attempts cannot yield a download URL |

## Fixtures

- Two users, two Note pages, valid and foreign Note-image assets.

## Commands

```text
dotnet test src/backend/FluentA.Application.UnitTests/FluentA.Application.UnitTests.csproj
npm --prefix src/frontend run test:run
npm --prefix src/frontend run build
Push-Location src/frontend; npx playwright test e2e/notes-workspace.spec.js; Pop-Location
```

## Acceptance Evidence

- Applied `20260716190651_AddNotePageAssetOwnership` to local PostgreSQL.
- Backend unit suite: 115 passed.
- Frontend suite: 17 files and 64 tests passed with one Vitest worker after
  default-pool retries exposed an unrelated vocabulary-test timeout/worker
  crash.
- Notes E2E: 2 passed against local API, MinIO, and PostgreSQL. It proves
  upload/finalize, signed URL delivery after reload, base64 rejection,
  exclusive page attachment, reference detachment, and foreign-user `404`.
- API build passed with the existing `NU1903` Microsoft.OpenApi advisory; the
  frontend production build passed with existing SignalR pure-annotation
  warnings.
