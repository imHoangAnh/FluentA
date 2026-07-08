# Validation

## Commands

```text
dotnet test src/backend/FluentA.Application.UnitTests/FluentA.Application.UnitTests.csproj --filter "FlashcardServiceTests|Review"
dotnet build src/backend/FluentA.API/FluentA.API.csproj --no-restore
npm --prefix src/frontend run test:run -- App.test.tsx
npm --prefix src/frontend run build
git diff --check
```

## Evidence

- Focused backend unit tests passing.
- Focused frontend route tests passing.
- Frontend production build passing.
