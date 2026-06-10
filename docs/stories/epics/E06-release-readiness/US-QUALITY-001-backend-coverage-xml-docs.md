# US-QUALITY-001 Backend Coverage And XML Documentation Gate

## Status

implemented

## Lane

normal

## Product Contract

`SPEC.md` Definition of Done requires at least 75% unit coverage for Domain and
Application logic, and XML documentation comments for public C# API
methods/services.

## Relevant Product Docs

- `SPEC.md`
- `docs/stories/spec-coverage-map.md`

## Acceptance Criteria

- A reusable backend quality command measures Domain and Application logic line
  coverage and fails below 75%.
- Coverage measurement excludes DTO records and compiler-generated regex code,
  keeping the threshold focused on Domain/Application logic.
- Public HTTP action methods and application service contract methods have XML
  summaries.
- The reusable backend quality command fails when those XML summaries are
  missing.

## Design Notes

- Command: `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-backend-quality.ps1`.
- Coverage source: coverlet Cobertura XML from `dotnet test`.
- XML-doc scope: API controller action methods plus `IAuthService`,
  `IFlashcardService`, and `IVocabularyService`.

## Validation

When updating durable proof status, use numeric booleans:
`scripts/bin/harness-cli story update --id US-QUALITY-001 --unit 1 --integration 0 --e2e 0 --platform 1`.

| Layer | Expected proof |
| --- | --- |
| Unit | Backend unit tests pass while collecting coverage. |
| Integration | Not required; this is a quality gate. |
| E2E | Not required; this is a quality gate. |
| Platform | PowerShell verifier runs from the repository root on Windows. |
| Release | Domain/Application coverage and XML-doc checks pass. |

## Harness Delta

Adds `scripts/verify-backend-quality.ps1` as a reusable SPEC quality gate.

## Evidence

- `dotnet test src/backend/FluentA.slnx --no-restore`: passed 60 backend
  tests.
- `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-backend-quality.ps1`:
  passed with Domain logic line coverage 87.99% (447/508) and Application logic
  line coverage 77.97% (616/790), plus XML summary verification for controller
  action methods and service contract methods.
