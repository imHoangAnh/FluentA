# Validation

## Feasibility Result

`READY WITH CONSTRAINTS`

| Assumption | Risk | Evidence | Result |
| --- | --- | --- | --- |
| Azure supports short scripted assessment without the SDK | provider integration may require native runtime | Official short-audio REST contract accepts WAV PCM, a Base64 `Pronunciation-Assessment` header, Basic/HundredMark/FullText settings, and detailed `AccuracyScore` | Ready |
| Browser can send one portable documented format | WebM would require GStreamer/FFmpeg | Browser-owned PCM-to-WAV encoding produces documented 16-kHz mono WAV without a server codec | Ready; add deterministic WAV tests |
| Target word can be owner-scoped | cost/authorization leak | Current EF paths join word -> page -> board and scope `board.UserId`; the new lookup can reuse this boundary | Ready |
| Provider failures can avoid attempts | frontend may count transport errors as Wrong | API success contains `correct`; all provider failures use a distinct 503 envelope and no Review mutation | Ready; browser proof required |
| Date-only backfill preserves current due dates | direct cast can shift dates | Live PostgreSQL has four active rows, all `2026-07-20 17:00Z`; Vietnam conversion yields `2026-07-21`, while UTC cast incorrectly yields `2026-07-20` | Ready with explicit Vietnam backfill |
| Existing tables can be removed | destructive active dependency | `word_review_histories` feeds persistence/summary/dashboard and `flashcard_cards` feeds synchronization/viewer | Rejected; keep both |
| Baseline is stable enough to attribute regressions | dirty worktree could mask failures | Domain 40/40, Application 121/121, frontend 68/68, production dependency audit 0 vulnerabilities | Ready; preserve unrelated changes |

## Constraints

- Automated proof uses fake provider responses; no Azure key is available or
  required for tests.
- Live Azure correctness/latency remains an operator smoke test after a key is
  configured. Absence of that smoke cannot be reported as provider proof.
- The one-time backfill is intentionally tied to `Asia/Ho_Chi_Minh` because the
  live rows and current user timezone prove that encoding. Future scheduling
  stores `DateOnly` from the timezone supplied by each request.
- The current worktree contains unrelated user changes, including Review UI,
  vocabulary, Todo, Flashcard, and docs. Implementation must patch in place and
  must not revert them.

## Proof Strategy

Prove each boundary independently, then prove the user flow with deterministic
provider fixtures.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | WAV validation, threshold 69/70, owner result mapping, provider failure mapping, DateOnly state transitions and scheduling |
| Integration | Azure HTTP request headers/body/response parsing through fake handler; EF query projections and migration SQL |
| E2E | Practice two attempts -> Retry/Skip; Review two attempts -> persisted Wrong; 503 does not consume attempt; feedback and recap content |
| Platform | 320/768/1024/1440 responsive layout, ten desktop columns, keyboard/microphone controls, no horizontal overflow |
| Performance | audio body <= 400 KiB, max five-second browser capture, ten-second backend duration, ten-second provider timeout |
| Logs/Audit | no key/audio/raw response in source or captured request logs; generic client errors |

## Baseline Evidence

Recorded 2026-07-20 before source implementation:

- `dotnet test FluentA.Domain.UnitTests --no-restore`: 40/40 passed.
- `dotnet test FluentA.Application.UnitTests --no-restore`: 121/121 passed.
- `npm run test:run`: 68/68 passed across 17 files.
- `npm audit --omit=dev --audit-level=high`: 0 vulnerabilities.
- PostgreSQL TCP on `127.0.0.1:5432`: reachable.
- Live `word_review_states`: four active rows; all due values encode July 21
  Vietnam as July 20 17:00 UTC.

## Planned Commands

```text
dotnet test src/backend/FluentA.Domain.UnitTests/FluentA.Domain.UnitTests.csproj
dotnet test src/backend/FluentA.Application.UnitTests/FluentA.Application.UnitTests.csproj
dotnet build src/backend/FluentA.API/FluentA.API.csproj
dotnet ef database update --project src/backend/FluentA.Infrastructure --startup-project src/backend/FluentA.API
npm run test:run
npm run lint
npm run build
npm audit --omit=dev --audit-level=high
npx playwright test e2e/practice-workflow.spec.js e2e/review-workflow.spec.js e2e/e29-practice-library.spec.js --project=chromium
git diff --check
```

## Acceptance Evidence

`IMPLEMENTED WITH CREDENTIALED PROVIDER SMOKE DEFERRED`

No P1 or P2 finding remains in the E32 implementation. The only feature-level
proof not executed is a real request charged against an Azure subscription;
the provider boundary and failure handling are instead covered with a fake HTTP
handler and the live API is proven with provider configuration disabled.

| Decision | Evidence | Result |
| --- | --- | --- |
| D1-D2 | Authorized raw-WAV endpoint, owner-scoped lookup, Azure REST adapter, fake-provider header/body/score tests, and boolean-only response | Passed |
| D3 | Practice browser flow proves two Wrong attempts, one Retry pair, Correct completion, and recap; Skip is exposed only after an exhausted pair | Passed |
| D4 | Review browser flow proves first Wrong does not persist and second Wrong persists once before recap | Passed |
| D5 | Live 503 and browser fixture both prove a provider failure leaves the pronunciation attempt count unchanged | Passed |
| D6 | Browser layout proves 10 columns at 1440 px, 7 at 1024 px, 2 at 375 px, and 1 at 320 px without changing Flashcards density | Passed |
| D7-D9 | Focused Practice/Review flows show only Correct/Wrong between attempts and the centered recap fields in the approved order; long definition text wraps without horizontal overflow | Passed |
| D10 | Migration applied to live PostgreSQL; both columns are `date`, all four existing Vietnam-local `2026-07-21` values were preserved, and EF reports no pending model changes | Passed |
| D11 | Active `word_review_histories` and `flashcard_cards` mappings and behavior remain intact | Passed |

## Executed Proof

- Domain unit tests: 40/40 passed.
- Application unit tests: 127/127 passed, including six new pronunciation
  cases for WAV validation, 69.99/70 threshold behavior, provider failure,
  foreign-word isolation, and the Azure HTTP contract.
- Frontend Vitest: 69/69 passed across 18 files, including deterministic PCM
  WAV encoding coverage.
- Focused E32 and affected-file ESLint: passed.
- API build: passed with zero errors. The existing transitive
  `Microsoft.OpenApi 2.0.0` high-severity advisory remains outside this story.
- EF migration: `20260720130118_ConvertReviewStateDatesToDateOnly` applied to
  live PostgreSQL; `dotnet ef migrations has-pending-model-changes` reported no
  model changes.
- Live API boundary: valid WAV with disabled provider returned 503; invalid WAV
  returned 400; a foreign word returned 404; an anonymous request returned 401.
- Focused Playwright: 9/9 passed across Practice, Review, Practice library, and
  E32 pronunciation scenarios.
- Direct Vite production bundle: passed for 2,081 modules; existing SignalR
  pure-annotation warnings remain non-blocking.
- Production dependency audit: `npm audit --omit=dev --audit-level=high`
  reported zero vulnerabilities.
- Scoped E32 `git diff --check`: passed, apart from line-ending notices.
- Static frontend scan found no active `SpeechRecognition`, transcript, or
  pronunciation-score display in Practice, Review, or Pronunciation features.
- Configuration/source scan found no committed Azure subscription key and no
  logging of audio, reference text, transcript, or raw provider responses.

## Known Unrelated Or Deferred Evidence

- A credentialed Azure correctness/latency smoke was not run because no Azure
  key was supplied. This is intentionally not represented as passed evidence.
- Full `npm run build` and `npm run lint` stop at the pre-existing unrelated
  `TodoPage.tsx` unused `formatDay` declaration. The direct production bundle
  and all E32-scoped lint checks passed.
- Global `git diff --check` reports pre-existing trailing whitespace in
  `TodoPage.tsx`; the scoped E32 diff check passed.
- The existing backend dependency graph also reports transitive
  `AngleSharp 0.17.1` (moderate) and `Microsoft.OpenApi 2.0.0` (high)
  advisories. Dependency upgrades were not folded into this approved UI,
  pronunciation, and date-migration story.
- The older `e2e/flashcard-practice.spec.js` still models the retired browser
  transcript flow and is not part of the current E17/E29/E32 release suite.

## Flashcards Density Follow-Up - 2026-07-21

The user approved extending D6's compact deck presentation to Flashcards.
Focused browser proof passed 9/9 and verifies identical 10/7/2/1 responsive
geometry for `/flashcards` and `/practice`, while preserving their separate
viewer-link and modal-button behaviors. Product truth is reconciled in
`docs/product/flashcards.md` and `docs/product/learning-workflows.md`.
