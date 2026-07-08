# Validation

## Commands

```text
dotnet test src/backend/FluentA.Domain.UnitTests/FluentA.Domain.UnitTests.csproj --filter "Flashcard|Practice|Review|Vocabulary|Srs"
dotnet test src/backend/FluentA.Application.UnitTests/FluentA.Application.UnitTests.csproj --filter "Flashcard|Practice|Review|Vocabulary|Srs"
dotnet build src/backend/FluentA.API/FluentA.API.csproj --no-restore
dotnet tool run dotnet-ef migrations script --project src/backend/FluentA.Infrastructure --startup-project src/backend/FluentA.API
npm --prefix src/frontend run test:run -- App.test.tsx
npm --prefix src/frontend run build
.\scripts\bin\harness-cli.exe query matrix
git diff --check
```

## Evidence

- `dotnet build src/backend/FluentA.API/FluentA.API.csproj --no-restore` passed with the existing `Microsoft.OpenApi` `NU1903` warning.
- `dotnet test src/backend/FluentA.Domain.UnitTests/FluentA.Domain.UnitTests.csproj --filter "Flashcard|Practice|Review|Vocabulary|Srs"` passed `10/10`.
- `dotnet test src/backend/FluentA.Application.UnitTests/FluentA.Application.UnitTests.csproj --filter "Flashcard|Practice|Review|Vocabulary|Srs"` passed `27/27` after updating the Level 5 test double.
- `npm --prefix src/frontend run test:run -- App.test.tsx` passed `10/10`.
- `npm --prefix src/frontend run build` passed with the existing SignalR Rolldown `INVALID_ANNOTATION` and chunk-size warnings.
- `.\scripts\bin\harness-cli.exe query matrix` ran successfully.
- `git diff --check` reports only existing LF/CRLF conversion warnings.
- Legacy E2E files `src/frontend/e2e/all-words-sm2.spec.js` and
  `src/frontend/e2e/page-deck-active-recall.spec.js` were retired because they
  only exercised the removed page-deck review and compatibility-route model
  superseded by Feature 23. Active learning coverage remains in
  `flashcard-viewer.spec.js`, `learning-navigation.spec.js`,
  `practice-workflow.spec.js`, and `review-workflow.spec.js`.
