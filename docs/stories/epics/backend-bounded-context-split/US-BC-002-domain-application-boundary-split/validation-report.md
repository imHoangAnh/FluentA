# Validation Report

## Status

READY WITH CONSTRAINTS - approval required before execution.

## Reality Gate

| Gate | Result | Evidence |
| --- | --- | --- |
| Mode fit | PASS | `US-BC-002` is the first source refactor for a high-risk bounded-context split. |
| Repo fit | PASS | Mixed Flashcards domain/application contracts and tests exist in the repo. |
| Assumptions | PASS WITH CONSTRAINTS | Repository/EF/API/frontend/Vocabulary cutovers stay out of scope unless compilation proves a tiny temporary adapter is required. |
| Smaller path | PASS | Domain/application contracts can be split before repository and controller cutover. |
| Proof surface | PASS | Existing domain and application tests cover the behavior that must survive the split. |

## Feasibility Matrix

| Part / Assumption | Risk | Evidence | Result |
| --- | --- | --- | --- |
| Domain ownership split is possible | HIGH | Current domain files include separately assignable Flashcard, Practice, and Review types. | READY |
| Application service split is possible | HIGH | `FlashcardServiceTests` already isolate methods for Flashcard reads, Practice summaries/settings, Review settings/sessions/dashboard, and Review answer validation. | READY WITH CONSTRAINTS |
| Repository/EF split can wait | HIGH | `US-BC-001` assigns repository/EF to `US-BC-003`; this story can keep temporary compile adapters if needed. | READY WITH CONSTRAINTS |
| Legacy type handling is bounded | MEDIUM | `CardState` is active through `FlashcardCard`; `CardReview`/`ReviewRating` appear active mainly in domain and migration snapshots. | READY WITH CONSTRAINTS |
| Baseline tests are healthy | MEDIUM | Domain tests passed 49/49; Application tests passed 103/103 after rerunning separately. | READY |

## Validation Commands

```text
rg -n "BoundedContexts\.Flashcards|namespace FluentA\.(Domain|Application)\.BoundedContexts\.Flashcards|using FluentA\.(Domain|Application)\.BoundedContexts\.Flashcards" src/backend/FluentA.Domain src/backend/FluentA.Application src/backend/FluentA.Domain.UnitTests src/backend/FluentA.Application.UnitTests -S
rg -n "CardReview|CardState|ReviewRating" src/backend/FluentA.Domain src/backend/FluentA.Application src/backend/FluentA.Infrastructure src/backend/FluentA.*UnitTests -S
dotnet test src/backend/FluentA.Domain.UnitTests/FluentA.Domain.UnitTests.csproj
dotnet test src/backend/FluentA.Application.UnitTests/FluentA.Application.UnitTests.csproj
git diff --check
```

## Validation Notes

- The first parallel Application test attempt failed because
  `FluentA.Domain.dll` was locked by `VBCSCompiler` while the Domain test was
  also building. Rerunning the Application test by itself passed.
- One legacy-type scan used a wildcard path that PowerShell rejected for
  `src/backend/FluentA.*UnitTests`; the repo evidence still identified the
  important active references.
- `git diff --check` passed with the existing CRLF warning for `SPEC.md`.

## Constraints For Execution

- Do not change public HTTP routes.
- Do not change frontend code.
- Do not create EF migrations or schema/table changes.
- Do not split `EfFlashcardRepository`; only add temporary compile adapters if
  unavoidable.
- Preserve Practice mode, Review random-mode, and FluentA SRS behavior.
- Record any intentionally temporary old Flashcards references that remain
  after the split.

## Approval Gate

Approve execution for `US-BC-002` only. Approval means source changes for
domain/application boundary split plus backend unit/build verification. It does
not approve repository/EF split, controller route cutover, frontend cutover, or
Vocabulary sync handler split.
