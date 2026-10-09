# Execution Plan: Vocabulary / Practice / Review recovery

Date: 2026-10-04

## Status

Active. All five fixes are implemented and focused local validation passed.
The 2026-10-09 Practice settings removal and Recap clarification are implemented
with local build/test/model proof.
PostgreSQL transaction/concurrency execution and real browser proof remain
pending; do not treat this as a completed production rollout.

## Outcome and authority

Implement the five choices explicitly accepted in this conversation:

- Each page owns its add/edit draft. Switching pages restores that page's draft;
  drafts live only in memory and disappear on refresh or closing the app.
  Delayed mutation responses update the originating page.
- After a failed Practice mutation, read authoritative progress. If saved,
  automatically advance; otherwise keep the answer for manual retry. Never
  count a replay as another attempt. Disconnected recovery blocks resubmission.
- An abandoned Practice session stops recording, blocks answers and returns to
  `/practice` with an explanation.
- Persist all eight column keys when reordering visible columns. A newly
  enabled optional column goes at the end. Failed preference saves show an
  error and restore the last confirmed configuration.
- Review enrollment and Recap completion commit together. Existing active
  Review schedules stay unchanged. Failed enrollment retains the selected
  level and offers manual retry with the toast
  `Fail to add word to review, please try again`.

Existing authority: `docs/product/vocabulary.md`, `AGENTS.md`, and
`docs/WORKFLOW.md`. These choices supplement the existing fixed Practice and
Review contracts; Review pronunciation's two-attempt rule does not change.

## Scope

Vocabulary drafts/preferences, Practice recovery/status, atomic enrollment,
and focused regression tests. Preserve unrelated dirty work and existing API
routes. Level Five Trash runtime removal is already verified in its separate
plan; legacy rows remain deferred. Do not apply migrations to the user's DB.

## Approach

Keep drafts in a memory-only page store. Capture page/board IDs in mutations.
Use an explicit Practice transaction boundary and existing attempt primary keys
for optional request identifiers, avoiding a schema change. GET exposes saved
attempt counts/identifiers so recovery can recognize saved incorrect answers.
The frontend rereads after uncertainty and never automatically resubmits.

## Risks and recovery

The working tree has substantial prior changes. Edit only affected owners;
retain existing history-preservation and deletion behavior. Test fixture data
must be isolated. Report mocked/component proof separately from live database
or browser proof. Old LevelFive rows remain a deployment compatibility gap.

## Progress

- [x] Read repository instructions, authority and affected behavior.
- [x] Implement Vocabulary drafts and preferences.
- [x] Implement Practice transactional persistence and replay protection.
- [x] Implement Practice recovery, abandonment and manual Recap retry.
- [x] Run local validation and update product authority and result.
- [ ] Execute dedicated PostgreSQL integration tests and real browser recovery.

## Validation

Baseline: Vocabulary table tests still assert retired cell autosave behavior;
the previous audit reproduced cross-page drafts, hidden-column truncation,
stale Practice position after refetch and abandoned sessions accepting UI input.
Add behavior regressions for these cases and transaction failure/replay, then
run frontend tests/build/lint and backend tests.

Observed on 2026-10-04:

- Frontend focused suite: 39/39 passed across VocabTable, WorkspacePage,
  PracticeSessionPage, ReviewSessionPage and TrashPage, using Vitest with
  `--maxWorkers 2`. API and microphone behavior are mocked; React components,
  routing, cache and interactions are exercised.
- Regressions cover page/board switching during delayed saves, in-memory
  add/edit drafts, full column order, preference rollback, normal Continue,
  saved/unsaved/disconnected answer recovery, saved wrong pronunciation counts,
  manual Recap retry/toast, late audio after abandonment, external progress,
  and lost completion responses.
- Backend `dotnet test src/backend/FluentA.slnx --no-restore --verbosity quiet`
  passed 68 Domain, 181 Application, 27 Infrastructure and 38 API tests
  (314 total). That run skipped 12 external/database tests. The subsequently
  added fourth learning integration test compiled; the focused learning
  integration run explicitly skipped all four for missing configuration.
- Positive/negative local proof: accepted Recap stages save once; an advance
  conflict or injected infrastructure failure yields rollback, not commit;
  replay does not stage enrollment again; omitted hidden column keys produce
  `VALIDATION_ERROR` on `columnOrder` without a save. Service transaction tests
  use test doubles; actual database commit/rollback is not yet proven here.
- Frontend TypeScript/Vite production build passed. Scoped ESLint passed for
  affected code and tests. Scoped `git diff --check` passed.
- The complete frontend run with two workers passed 142 and failed 10. One
  failure was the newly added completion test's incorrectly queued initial GET;
  its fixture was corrected and the focused 39-test run passed afterward.
  Nine failures outside this change remain in AppShell/routes, password reset,
  Dashboard, Journal calendar and notification sync. Global lint still reports
  four errors in AuthDialog, auth-store and GuestLandingPage. Those files were
  not changed by this implementation. The entire frontend suite is not green.

## Remaining Runtime Proof

No PostgreSQL service/listener or running Docker daemon was available during
inspection. No live database rows or migrations were changed, and no real
browser/microphone/backend end-to-end run was performed.

`PracticePersistenceIntegrationTests` uses the existing PostgreSQL/xUnit test
owner. Set `FLUENTA_LEARNING_VALIDATION_POSTGRES` to an owner-supplied connection
for the dedicated database **fluenta-learning-validation**. It rejects other
database names, creates a GUID-named schema from the current EF model, and
drops only that schema on completion. It does not run migration/backfill proof.

Run from the repository root:

```powershell
dotnet test src/backend/FluentA.Infrastructure.UnitTests/FluentA.Infrastructure.UnitTests.csproj --no-restore --filter FullyQualifiedName~PracticePersistenceIntegrationTests
```

The four cases exercise real rollback after a save, enrollment replay,
concurrent duplicate wrong answers, concurrent reactivation from two sessions,
unchanged active schedules and abandoned-session rejection.

## Enforcement And Recovery

Local xUnit/Vitest commands are available and the focused proofs above passed.
No hook was installed or changed. `.github/workflows/pr-ci.yml` invokes the
backend and frontend test/build commands, but no remote CI run was observed.
The PostgreSQL integration tests require the explicit environment variable and
are skipped without it; CI presence does not imply this proof ran. Branch
protection and merge blocking were not verified or changed.

Keep this plan active until runtime proof is recorded. Global frontend failures
belong to their existing owners; preserve the unrelated dirty changes.

## Result

The five accepted behaviors are implemented with local regression proof and
living product contracts in `docs/product/vocabulary.md` and
`docs/product/practice.md`. Production readiness remains unverified until the
database/browser checks above run. Legacy LevelFive rows are still tracked in
the independent removal plan and remain deferred.

## Practice settings removal and Recap clarification (2026-10-09)

The user explicitly removed the unused `practice_settings` table and confirmed
that Recap is a word summary and self-assessed Review enrollment screen after
the three Practice modes, not another Practice mode.

- Removed the unused PracticeSettings entity, EF configuration, and DbSet.
  `20261009020626_RemovePracticeSettings` drops only `practice_settings` in Up;
  historical migrations remain unchanged. Down recreates an empty table and
  cannot restore rows dropped by Up.
- Kept the persisted `recap` step/API value so existing sessions can resume.
  The PracticeMode enum already excludes Recap. The frontend now types only
  Dictation, Word to Meaning, and Pronunciation as exercise modes; Recap remains
  a separate screen that displays the word and offers Review levels 0-5.
- EF reported no pending model changes before or after scaffolding. The
  generated migration SQL contains `DROP TABLE practice_settings`. Focused
  backend Practice/Review tests passed (27 passed, four PostgreSQL-gated
  skipped). The frontend production build and 13 focused Practice tests passed,
  including Recap word display and level submission.
- Docker was unavailable on this machine, so this migration was not applied to
  an isolated PostgreSQL database or the user's database. PostgreSQL schema
  proof and the existing recovery/concurrency/browser proof remain pending.
