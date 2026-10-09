# Execution Plan: FluentA feature-by-feature migration

Date: 2026-10-08

## Status

Active. Countdown, Todo, Habit, Project realtime removal, Notifications removal,
Journal/Notes, Dashboard, Pomodoro/SignalR removal, shared deletion/cleanup removal,
the Settings removal/Profile route cutover, Vocabulary, and Review have been validated locally.
Later feature migrations remain.

## Outcome

Keep the current React, ASP.NET Core, and PostgreSQL stack and the retained user
flows while removing obsolete product code and simplifying local validation.
Migrate one feature at a time; validate each feature before starting the next.
Use a fresh database and decide deployment only after local code and tests pass.

## Context

- `AGENTS.md` and `docs/WORKFLOW.md` define authority and proof boundaries.
- The user chose the current working tree, including uncommitted changes, as the
  starting point. Preserve all unrelated changes.
- Keep Auth/OTP/Google/password reset, Profile, three existing image types,
  pronunciation, Vocabulary -> Practice -> daily Review, Todo recurrence, Habit,
  Project, Notes, Journal, Countdown, and Dashboard.
- Remove Pomodoro, Notifications, Trash, realtime, all reminders, and Countdown
  recurrence. Todo remains separate from Project.
- Deletes require confirmation. Countdown uses `deleted_at` and retains its
  cover; all feature deletes retain rows and objects. Deleting
  Vocabulary hides related Practice/Review history while retaining its rows.
- `docs/decisions/vocabulary-history-retention.md` and the active legacy Trash
  plans describe superseded behavior. Current deletion authority is
  `docs/product/deletion.md`.

## Scope

First feature: Countdown. Preserve the current Active and Complete boards; a
Countdown moves to Complete on the day after its target date in Vietnam time and
remains visible. Keep name, target date, and optional cover image. Remove alerts
and repeat pattern from the UI, API, domain model, scheduler, and new schema.
After confirmation, set `deleted_at` and `updated_at`, then hide the Countdown
from API results. Retain the database row, cover asset, and R2 image. Do not
add a Trash or restore screen in this feature.

Second feature: Todo. Keep My Day, Week, completion, ordering, importance,
duplicate, and the existing recurrence patterns. Remove Todo reminders, Trash
participation, and realtime sync. Confirmed deletion sets `deleted_at` on the
selected Todo and its already-created future occurrences; past completed
occurrences stay visible. There is no restore UI.

Third feature: Habit. Keep tracking, schedules, start dates, goals, and statistics.
Remove reminders, realtime, and Trash participation. Confirmed deletion sets
`habits.deleted_at`/`updated_at`, retains the Habit row and unchanged check-ins,
and hides the Habit from app queries. No restore or automatic purge.

Fourth feature: Project. Keep the existing board, column, and card behavior and
keep Project separate from Todo. Remove Project's SignalR notification and its
client subscriber. Mutations continue refreshing Project queries in the current
app. Keep the shared deletion behavior in `docs/product/deletion.md`.

Fifth feature: Notifications. The user approved removing the feature after
Project. Remove its page, inbox menu and badge, route, API, use cases, repository,
domain entity, EF configuration and SignalR notifier. Remove the browser
notification prompt/delivery in Pomodoro under the already accepted no-reminders
policy; keep its timer for its separate migration. Keep shared SignalR while
Pomodoro still consumes it. Add a migration removing only the obsolete
notifications table; apply it only to an isolated validation database, never the
user's database. Preserve historical migrations until the final fresh baseline
is rebuilt. Old frontend notification URLs use the existing unknown-route
fallback to Overview; the removed API URLs return the existing 404 response.

Later features are separately scoped and validated before work begins.

## Approach

1. Inspect the Countdown route, service, domain, repository, EF model, UI, tests,
   and scheduler callers. Record the current baseline and preserve dirty work.
2. Implement the Countdown contract across frontend and backend. Remove only
   Countdown-specific alert/recurrence scheduling and Trash participation.
3. Validate focused domain/application/API/frontend behavior, including cover
   retention, ownership, target-date transition, and delete confirmation.
4. Validate the EF model against a dedicated fresh local database before
   treating the feature as complete. Rebuild the final initial migration after
   all retained features have been migrated.
5. Update product documentation and record proof or gaps, then select the next
   feature with the user.

## Risks And Recovery

- Soft-deleted Countdown rows and cover images remain stored indefinitely.
  Define cleanup or restore behavior only after a separate product decision.
- Keep `cover_asset_id` unique across visible and hidden Countdown rows so one
  retained image cannot become attached to multiple Countdowns.
- The current CI references removed `deploy/production` files. Fix CI as part
  of the wider migration before claiming repository-wide proof.
- No production data or external API clients need migration, but never apply
  schema changes to an existing user database without checking its identity.

## Progress

- [x] Complete product interview and select Countdown first.
- [x] Inspect Countdown implementation and related dirty paths.
- [x] Implement Countdown UI, API, domain, scheduler, Trash removal, and EF migration.
- [x] Run focused domain/application/frontend tests and EF model check.
- [x] Validate the new soft-delete migration and retained cover against an
      isolated PostgreSQL and object-storage runtime, then exercise the page.
- [x] Record Countdown result.
- [x] Prepare Cloudflare R2 local configuration and repair storage setup links.
- [ ] Validate presigned upload/download and deletion against the user's R2
      bucket after its credentials are configured locally.
- [x] Select Todo as the second feature with the user.
- [x] Migrate Todo behavior, schema, UI, and local PostgreSQL proof.
- [x] Select Habit as the third feature with the user.
- [x] Migrate Habit and validate tracking plus retained history in PostgreSQL.
- [x] Select Project as the fourth feature with the user.
- [x] Remove Project realtime while preserving existing Project flows.
- [x] Validate Project service and frontend runtime behavior.
- [x] Select Notifications as the fifth feature with the user.
- [x] Remove Notifications from UI, backend, realtime and current EF model.
- [x] Validate removal and retained navigation plus the isolated schema.

## Decisions

- 2026-10-08: Keep Active and Complete; a target date becomes Complete the next
  day in Vietnam time.
- 2026-10-08: Remove Countdown alerts and recurrence, but keep the existing
  optional cover image.
- 2026-10-08: The user superseded permanent Countdown deletion. DELETE now
  sets `deleted_at`/`updated_at`, hides the row, and retains its cover asset and
  R2 object. There is no Trash or restore UI.
- 2026-10-08: Use Cloudflare R2 for retained image types in development and
  future production. The existing S3 API adapter supports R2 by configuration;
  MinIO was used only for isolated local proof. Live R2 validation awaits a
  bucket and developer-owned credentials. No legacy objects need copying when
  the planned fresh database is used.
- 2026-10-08: Todo is second. Keep recurrence; deleting one occurrence also
  soft-deletes its already-created future descendants via `deleted_at`, while
  earlier completed occurrences remain. Remove reminders, Trash, and realtime
  from Todo.

- 2026-10-08: The user approved Habit deletion using `deleted_at` while retaining
  all check-in records. Remove reminders and realtime; keep current tracking.
- 2026-10-08: Keep the existing Project board/card workflow, independent from
  Todo. Remove Project realtime; mutations refresh the current app's queries.
- 2026-10-08: The user approved Notifications removal next. Keep Pomodoro and
  its shared SignalR runtime until its separate removal; remove its browser
  notification prompt under the previously accepted removal of all reminders.

## Notifications removal baseline (2026-10-08)

- Backend solution build passed with zero warnings/errors before edits.
- AppShell and ProtectedRuntime baseline: three tests passed; the existing
  shell-metadata test failed for Profile and Settings redirect branches. Keep
  that unrelated failure separate from removal/navigation proof.
- Notification controller already has uncommitted ApiResponse edits; deleting
  that owned controller is part of the approved feature removal. Preserve all
  unrelated API, deployment and Harness work.

## Validation

- `dotnet build src/backend/FluentA.slnx --no-restore --verbosity quiet` passed
  with no warnings or errors.
- `dotnet test src/backend/FluentA.slnx --no-build --verbosity quiet` passed:
  Domain 63, Application 183, Infrastructure 27, API 38. Eleven Infrastructure
  tests were skipped because their dedicated runtime variables were absent.
- Countdown domain tests: 4 passed. Countdown application tests: 9 passed,
  including foreign ownership, soft-delete idempotency, cover retention, and
  hiding deleted rows.
- Countdown frontend tests: 3 passed. `npm --prefix src/frontend run build`
  passed, with non-fatal Rolldown annotations from the existing SignalR package.
- `dotnet ef migrations has-pending-model-changes` reported no pending changes.
  The new `CountdownSoftDelete` migration adds nullable PostgreSQL
  `countdowns.deleted_at timestamptz` after `CountdownSimplification`.
- `dotnet ef database update` passed on an isolated fresh PostgreSQL database.
  Direct schema inspection confirmed `deleted_at` is nullable `timestamptz`.
- The dedicated PostgreSQL/MinIO integration test passed with its runtime
  variables set. It verified Active/Complete ordering, foreign-user delete
  rejection, a retained Countdown row with `deleted_at`, a `Ready` cover asset,
  retained object metadata, hidden list results, and repeated DELETE returning
  not found. It also proved the delete path makes no object-storage delete call.
- The browser created a Countdown with an uploaded cover (`201`), confirmed
  DELETE (`200`), and no longer displayed it. Direct PostgreSQL inspection
  found that exact row with `deleted_at`, the same cover asset in `Ready` state,
  and the matching object still present in isolated MinIO.
- The earlier browser auth reload regression was fixed and verified with its
  focused test and browser navigation during the preceding Countdown work.
- A broader Dashboard test run had one unrelated assertion failure: it expects
  “Open Review” to be a link, while the current Dashboard renders a button.
  Defer this to the Dashboard feature migration.
- Todo: backend solution and frontend production builds passed. The focused
  Todo page and protected-runtime tests passed (10 tests). Backend solution
  tests passed (Domain 59, Application 171, Infrastructure 27 with 8 skipped,
  API 38). The Todo PostgreSQL integration test then passed against a fresh
  isolated schema (1 test), proving retained rows, ownership, hidden lists,
  and matching `deleted_at` on the selected and future occurrences.
- `TodoSimplification` drops only the four Todo reminder columns and their
  index. EF reported no pending model changes. The isolated schema migrated
  through the new migration successfully.
- The full frontend suite had 9 failures outside Todo (AppShell/Auth,
  Journal, Dashboard, and Notifications); the 10 focused Todo/runtime tests
  passed. These wider failures remain for later feature work.
- Habit: backend solution build passed with zero warnings and errors. Backend
  tests passed (Domain 58, Application 172, Infrastructure 27 with 9 skipped,
  API 40). The two new PostgreSQL tests subsequently ran and passed on the
  dedicated `fluenta_habit_validation` database at port 15441.
- Habit PostgreSQL proof applied all migrations and confirmed `deleted_at`
  remains `timestamptz`, all three reminder columns are gone, the Habit and
  unchanged check-in IDs/dates/timestamps remain after deletion, and deleted
  or foreign Habits cannot be mutated or read through the service. A stale edit
  cannot clear `deleted_at`. No Trash entry or notification is created.
- Habit frontend and protected-runtime tests passed (9 tests), covering tracking
  fields without reminders, local check-in refresh, delete confirmation,
  cancellation, hidden deleted results, and retry after failure. Frontend
  production build passed; existing SignalR Rolldown annotations remain.
- EF reported no pending model changes after `HabitSimplification`. Scoped
  diff checks passed. Only the owned validation container was stopped and
  removed; the user's existing database was not changed. Updated Habit browser
  E2E scripts were not run in this step. Full frontend suite was not rerun.

## Result

Countdown, Todo, Habit, Project realtime removal and Notifications removal are
locally validated and ready for review. Keep this plan active for the remaining
feature migrations. Do not deploy until all retained features have been migrated
and the user chooses deployment.

## Cleanup and Trash removal (2026-10-08)

User approved removing all maintenance jobs, Quartz, Trash, Restore and Undo.
All business deletion uses `deleted_at`; Vocabulary history is hidden and retained.
Authority: `docs/product/deletion.md`. Preserve unrelated dirty changes.
Implemented and validated locally. The wider feature migration plan stays active.

### Changes

- Removed Quartz scheduling and its maintenance polling replacement, including
  pending-upload cleanup, archived-object purge, Trash purge and database cleanup.
- Removed Trash controllers, services, participants, repositories, domain model,
  route, sidebar entry and restore/Undo UI. Existing migration history is retained.
- Notes, Journal, Project and Vocabulary return `{ deleted: true }`, retain rows,
  and hide deleted resources. Confirmations replace immediate deletion in Notes,
  Journal and Vocabulary. Existing Project confirmations remain.
- Vocabulary stages history hiding with the source deletion and commits once.
  Word deletion hides sessions containing that word; Board/Page deletion also
  hides sessions for their pages. Entire related recaps are hidden; unaffected
  sessions remain. Practice/Review caches reset after a local Vocabulary delete.
- Avatar and removed Note images use `deleted_at` and retain R2 objects. Removed
  Note image links are soft-deleted. The production object-storage port no longer
  exposes DeleteObject. Test-only cleanup still removes isolated test objects.
- `20261008093743_RetainDeletedResourcesWithoutTrash` drops only `trash_entries`
  and the obsolete asset archive/purge columns and index. It does not remove
  business data tables. No migration was applied to the user's database.

### Proof

- Backend solution build passed with zero warnings/errors. Full backend tests
  passed: Domain 55, Application 169, Infrastructure 26, API 40 (290 passed).
  Twelve runtime-gated cases were skipped in the ordinary run.
- Five dedicated PostgreSQL tests passed at 127.0.0.1:15442 using only the guarded
  `fluenta_deletion_validation` database and fresh random schemas. They applied
  every migration and proved retained IDs, hidden completed Practice/Review
  sessions/items/attempts/states/history, ownership, repeated-delete not found,
  retained Note images/links, Project child rows and Journal rows. Injecting a
  PostgreSQL history-write error rolled back the source and all history changes.
- All 49 focused frontend tests passed across Notes, Journal, Project, Workspace
  and VocabTable. They cover confirmations, cancellation, failed-delete retry,
  no Undo and removal of cached learning recaps. The existing Journal calendar
  test now fixes its test clock instead of assuming the current month.
- Frontend production build passed. Existing SignalR Rolldown annotation
  warnings remain. EF reported no pending model changes. Source-scoped
  `git diff --check` passed; the unrelated baseline `.gitignore` whitespace
  warning was preserved.
- Runtime source inspection found no Trash, purge, Quartz, maintenance
  BackgroundService or object-delete operation. The sole hosted service is
  storage startup validation.
- The owned PostgreSQL validation container was removed. `hcd_local` remains
  untouched. Browser E2E and the user's live R2 bucket were not exercised.
  The full frontend suite was not rerun; earlier unrelated failures remain
  outside this scope. No commit, push or deployment was performed.

## Project realtime removal (2026-10-08)

- Removed the Project card-move SignalR notifier, its registration, and the
  frontend subscriber. Project mutations still update the current page's query
  data through its existing mutation invalidations.
- Kept the shared hub for Notification and Pomodoro, which are later removal
  work. Their removal will allow deleting the shared realtime runtime.
- Validation passed: six `ProjectServiceTests`, nine focused frontend tests
  across ProjectPage and ProtectedRuntime, the backend solution build, and the
  frontend production build. The frontend build still reports two existing
  SignalR Rolldown annotation warnings. No browser multi-tab test was run.

## Shared API response contract (2026-10-08)

- The working-tree contract uses `ApiResponse<T>` and a matching frontend type;
  all backend projects compile against it.
- Backend API and full solution builds passed with zero warnings or errors.
  The frontend production build passed. API contract test suites were not run
  during this step.

## Notifications removal result (2026-10-08)

Authority: the user selected Notifications after Project and approved starting
with AGENTS.md. Current product contract: `docs/product/notifications.md`.

### Changes

- Removed the inbox page, route, API client, sidebar menu/badge, shell injection
  properties and client subscriber. Removed the corresponding feature tests
  and obsolete reminder/inbox E2E scenarios; retained Habit coverage in the
  final-verification scenario and updated the route manifest.
- Removed the Notification controller, service/DTO/ports, domain entity,
  repository, EF configuration and SignalR notifier registrations.
- `20261008105211_NotificationsRemoval` drops only `notifications`; the current
  EF snapshot has no notification entity. Historical migrations are unchanged.
- Removed browser Notification calls from Pomodoro and unused notification
  icon/badge CSS. Pomodoro and its shared SignalR runtime remain until the
  separately selected next feature.

### Proof

- Backend solution build passed with zero warnings/errors. Full backend tests:
  Domain 54, Application 165, Infrastructure 26, API 39 (284 passed), with 12
  runtime-gated tests skipped in the ordinary run.
- Two gated `EfHabitRepositorySoftDeleteTests` subsequently passed against the
  dedicated PostgreSQL database `fluenta_habit_validation` at 127.0.0.1:15441.
  Each migrated a fresh random schema through NotificationsRemoval. They proved
  the notification table is absent while retained Habit rows and unchanged
  check-ins remain. EF reported no pending model changes.
- Five scoped frontend unit tests passed: two shell navigation tests, one
  ProtectedRuntime lifecycle test and two Pomodoro page tests. The unrelated
  Profile/Settings shell-metadata failure observed before edits was excluded
  from that focused command; it remains unresolved.
- Frontend production build passed, with the two existing SignalR Rolldown
  annotation warnings. No Notifications page chunk remains.
- Two Playwright scenarios passed on desktop and tablet against an isolated
  production preview at https://127.0.0.1:5185 with mocked API/auth responses.
  They proved no inbox menu/badge API requests, retained Todo/Notes navigation,
  Settings/Profile links and the existing fallback from both `/notifications`
  and `/notifications/old` to Overview. The initial tablet test assumed Logout
  was visible; its assertion was corrected to the existing responsive layout
  in SidebarAccount (hidden at widths <= 1100), without changing product code.
- An isolated real API at http://127.0.0.1:7085 returned 404 `NOT_FOUND` for
  GET notifications, GET unread-count, PATCH read-one and PATCH read-all.
  OpenAPI contained zero Notification paths and eight retained Pomodoro paths;
  anonymous Pomodoro config still returned 401. Storage and Azure Speech were
  disabled for this route-only proof; no provider request or user secret was
  used.
- Scoped diff whitespace checks passed. Source inspection found no Notification
  runtime reference outside preserved migration history and negative tests.
- The full frontend suite, broad route-manifest E2E, and modified live Habit
  final-verification E2E were not run in this step. Existing global API,
  deployment and Harness changes were preserved. No commit, push, deployment or
  migration of the user's database was performed.
- Stopped the owned API and production preview processes, verified their ports
  were released, and removed only the labelled validation PostgreSQL container.
  The user's existing `hcd_local` container remains running. The Git index is
  empty; all feature changes remain available in the working tree for review.

## Journal/Notes migration (2026-10-08)

Implemented and validated locally. Authority: docs/product/journal-notes.md and the user's final editor
and autosave decisions. Preserve existing dirty API/deployment/Harness changes.

- Replace shared editor with Tiptap and block images (manual resize,
  Left/Center/Right, no wrapping/free positioning).
- Add owned R2 Journal images, retained asset associations and one active entry
  per user/date with a PostgreSQL partial unique index.
- Auto-save new/existing content after two seconds, no Save button. Warn before
  abandoning an unsaved draft. No offline draft recovery.
- Validate sanitizer/ownership, save concurrency and discard behavior, browser
  image sizing/alignment, and schema against an isolated database.

### Changes and proof

- Shared Tiptap editor implements the approved extensions, H1-H6 and separate
  image blocks. Resize preserves aspect ratio; Left/Center/Right preserve size.
  Stored HTML uses durable asset IDs, width/height and alignment. Signed image
  URLs are hydrated on reads, including legacy Note image references.
- Added `journal-image` uploads and retained `journal_entry_assets` associations.
  `20261008123349_JournalNotesEditor` adds that table and the partial unique index
  `ux_journal_user_date_active`. Journal repositories stage changes; the service
  owns one save boundary. Duplicate dates return 409, including concurrent saves.
- New/existing Journal drafts and edited Note pages auto-save after two seconds.
  No Save button remains. Failed saves keep the in-memory draft and show an error;
  editing retries. Resource switches and router navigation show Stay/Discard.
  Browser reload/close uses the native unsaved-change warning. Opening a Journal
  unsuccessfully disables editing and clears prior content to prevent saving it
  into the unavailable entry. Earlier save responses cannot replace a newer draft.
- Full backend solution tests passed: Domain 54, Application 177,
  Infrastructure 28, API 39 (298 passed). Twelve unrelated runtime/provider-gated
  tests were skipped. The two new Infrastructure tests ran against dedicated
  PostgreSQL `fluenta_journal_validation` at 127.0.0.1:15442, using random schemas.
  They proved concurrent uniqueness, recreation after soft delete, owned image
  round trips and retained rows/assets/links. No user's database was migrated.
- EF `has-pending-model-changes` passed. Frontend production build and scoped
  editor/Journal/Notes ESLint passed. The two existing SignalR annotation warnings
  remain. Focused frontend evidence covers 21 distinct tests: Notes 10, editor 3,
  Journal 8. The initial 20-test serial run passed; Journal's subsequent eight-test
  run includes the new failed-open regression. A parallel frontend/backend run
  timed out; rerunning frontend serially passed without relaxing assertions.
- Three Playwright scenarios passed against the isolated Vite instance at
  https://127.0.0.1:5186 with mocked API/auth/storage responses. They exercised
  actual image resize/alignment, auto-save/reopen, tablet sizing, new Journal
  creation, journal-image upload type, failed saves and route warning choices.
  No live R2/provider request was made. Existing live Journal/Notes E2E scenarios
  were updated for auto-save, single-entry dates and the current API error shape;
  their discovery passed, but those live scenarios and the full frontend suite
  were not executed.
- Execution friction: npm argument forwarding was unreliable on this host;
  validation used the installed Node CLIs directly. Repository tooling and
  Harness guidance were not changed for this issue.
- Preserve unrelated API/deployment/Harness changes. No commit, push or deployment
  was performed. Live R2 upload/download and final database rollout remain separate
  verification steps when the user's R2 configuration is available.
- Stopped the owned Vite process and removed only the labelled validation
  PostgreSQL container and its disposable anonymous volume. Ports 5186 and 15442
  are released; the user's `hcd_local` remains running. Git index remains empty.

## Pomodoro and remaining SignalR removal (2026-10-08)

Validated locally. The user accepted this step after Journal/Notes. The existing product
interview removes Pomodoro and all realtime; the Dashboard retains Review, Todo,
Countdown, Habit and Project. Journal/Notes was committed locally as `7fcb101`.
Its validation was performed on the current working tree, including existing
shared API work. Unrelated API/deployment/Harness changes remain unstaged.

- Remove Pomodoro UI, route, menu, Dashboard widget, use cases and persistence.
- Remove the last SignalR client, hub, notifier, DI registration and dependency.
  Auth refresh and authentication coordination remain part of Auth.
- Reuse unknown-route fallback to Overview for old Pomodoro frontend URLs.
  Removed API endpoints and `/hubs/sync` return normal 404 responses.
- Normalize existing stored widget layouts using the current catalog filter;
  retain valid widget order and existing minimum/default behavior.
- Add a migration dropping only Pomodoro tables, retain historical migrations,
  and run schema proof only against a dedicated disposable PostgreSQL instance.
- Validate retained Dashboard/navigation, no hub requests, and removed API paths.
  Final Dashboard redesign/contract, Auth/Profile and deployment remain separate.

### Changes and proof

- Removed Pomodoro frontend/backend feature code, menu, routes, Dashboard widget,
  runtime state, tests and remaining SignalR client/hub/notifier/registrations.
  Removed the frontend SignalR dependency and unused memory-cache registration.
  Auth coordination remains unchanged. Old stored layouts discard the removed
  widget using the existing catalog normalization and preserve retained order.
- Migration `20261008130858_PomodoroRemoval` drops only `pomodoro_configs` and
  `pomodoro_sessions`. Historical migrations remain. Its Down creates empty
  tables; it cannot restore removed Pomodoro data.
- Backend build passed with zero warnings/errors. Full solution tests passed:
  Domain 50, Application 163, Infrastructure 27, API 39 (279 passed), with 14
  unrelated runtime/provider-gated tests skipped. The new Infrastructure test
  ran against dedicated PostgreSQL `fluenta_pomodoro_validation` on port 15443:
  migrate the previous schema, seed Pomodoro/User/Journal, migrate latest, verify
  both Pomodoro tables removed and User/Journal retained. EF pending-model check
  passed. No user's database was migrated.
- Frontend production build and scoped ESLint passed. SignalR build annotation
  warnings are gone. Fourteen focused frontend tests passed across separate runs
  (six widget preferences, five Dashboard, three retained app routes).
- Three Playwright scenarios passed across two runs, using mocked API/Auth:
  desktop/tablet removal, old URL fallback, retained navigation, old layout
  normalization and no Pomodoro/hub requests; existing widget layout also passed
  after correcting its stale authenticated-login fixture.
- The isolated real API on port 7087 returned 404 for all removed Pomodoro routes
  and SignalR negotiate/hub paths. OpenAPI has no Pomodoro/hub paths and retains
  eight Journal/Notes paths; anonymous Notes access returns 401. Storage/Speech
  were disabled for this runtime; no live R2/provider proof is claimed.
- Expanded app tests exposed two existing Auth assertions: `Log in` does not
  match the current `Login` button, and anonymous `/` shows GuestLandingPage
  instead of a login heading. AuthDialog and ProtectedRoute are unchanged from
  the prior commit. The three related retained-route tests passed separately.
  Full frontend and remaining legacy E2E suites were not executed.
- Browser logs also show an existing missing React list-key warning in
  SidebarNavigation's dialog rendering; that component is unchanged. This is
  retained as a separate UI cleanup item, not a failed removal assertion.
- Pomodoro removal is uncommitted. Unrelated dirty API/deployment/Harness work
  remains preserved. No push or deployment was performed.
- Stopped the owned API/Vite processes and removed only the labelled disposable
  PostgreSQL container and volume. Ports 5187, 7087 and 15443 are released; the
  user's `hcd_local` remains running. Git index is empty.

## Dashboard contract and migration (2026-10-08)

Validated locally. The user accepted the proposed Dashboard contract. Authority is
recorded in `docs/product/dashboard.md`.

- Retain five widgets, current layout controls/defaults and localStorage format.
- Make widget loading/error independent; provide query retry.
- Show Countdown target date and calendar days consistently with Countdown.
- Report failed Todo/Habit toggles, keep prior state and offer retry.
- Validate content limits/order, failure isolation, mutation recovery, Vietnam
  day rollover, layout persistence and browser behavior on an isolated frontend.
- Preserve uncommitted Pomodoro removal and unrelated API/Harness/deployment work.
  No commit, push, user database migration or deployment is part of this step.

### Changes and proof

- Each widget now renders its own skeleton/error/retry without waiting for other
  queries. Existing content limits, ordering and navigation remain. Countdown
  shows its target date and calendar days; expired cached entries are excluded
  immediately when the Vietnam date changes. Widget menu uses the actual catalog
  size for its maximum instead of the former hardcoded six.
- Todo/Habit controls are disabled while their mutation is pending. Failed saves
  retain displayed query state and offer retry. Habit saves capture the original
  local date; errors from yesterday cannot offer retry in today's widget.
- Nineteen focused Vitest tests passed: 13 Dashboard tests and six layout tests.
  Evidence covers independent loading/query recovery, pending duplicate-click
  blocking, failed/successful toggles, preview limits/ordering, all-Board totals,
  nearest Active Countdown/target date/calendar-day counts and midnight rollover
  with yesterday's failed Habit action hidden.
- TypeScript build (`tsc -b`), Vite production build, scoped ESLint and scoped
  `git diff --check` passed. Existing Pomodoro removal remains in the working tree.
- Three browser scenarios passed across separate runs on an isolated Vite server
  at https://127.0.0.1:5188: new desktop/tablet scenarios used mocked API/Auth to
  prove independent pending/loading/error, query retry, Countdown date and toggle
  failure recovery. Existing layout scenario proved widget bounds, drag ordering,
  persistence after reload and viewport fit. The first new scenario run failed
  due to an ambiguous text locator; exact matching fixed the test, then both
  scenarios passed. Desktop/tablet screenshots were visually inspected.
- Backend and database are unchanged in this step. No live backend/R2 integration
  or full frontend suite was run. The existing SidebarNavigation React key
  warning is still present; no new browser error was observed in these scenarios.
- Stopped the owned Vite process; port 5188 is released. No commit/push/deployment
  was made and the Git index is empty. Migration work continues in this active
  plan; all unrelated dirty work remains preserved.

## Settings removal and retained Profile (2026-10-09)

The user clarified that the next feature step removes Settings while retaining
Profile. The accepted contract is in `docs/product/profile.md`.

- Moved the existing Profile form and explicit Google link flow from the Settings
  module to the Profile module. `/profile` now renders the page directly. Removed
  the Settings sidebar item and Settings route aliases; old `/settings` URLs use
  the existing unknown-route fallback to Overview.
- Replaced `GET /api/v1/settings` with `GET /api/v1/profile`, returning the
  authenticated `UserProfileDto` directly in the standard response. The existing
  `PUT /api/v1/profile` now lives in ProfileController. No database model or
  migration changed.
- Backend solution build and 39 API unit tests passed. The isolated API returned
  404 for GET `/api/v1/settings` and 401 for anonymous GET/PUT `/api/v1/profile`;
  OpenAPI lists profile GET/PUT and no Settings path.
- Frontend production build passed. Five focused Profile/shell unit tests and
  six app-route unit tests passed. Five browser scenarios passed on an isolated
  Vite server with mocked API:
  Profile at 320, 768, 1024, and 1440 px, profile save, absent Settings link,
  and `/settings` fallback to Overview.
- Two E27 browser route-manifest scenarios passed after updating stale test
  assertions for the current public/Auth flow, persisted logout marker, and
  Review navigation button. This exercised the Profile route and removed
  Settings URLs on desktop and tablet.
- No authenticated PostgreSQL save or R2 upload was exercised in this cutover.
  Existing profile service behavior and data are unchanged. The isolated API and
  Vite processes were stopped; no commit, push, or user database change occurred.

## Vocabulary review (2026-10-09)

Vocabulary matches the retained contract in `docs/product/vocabulary.md` and
`docs/product/deletion.md`; no product-code change was needed in this review.

- Inspected `/api/v1/vocabs` routes, service, repository, frontend API and
  workspace. Nested board/page/word ownership, soft deletion, hidden retained
  Practice/Review history and the single service-owned save boundary match the
  documented contract. Confirmation is shown before Board, Page and Word DELETE.
- Focused backend tests passed: Domain 10, Application 36 and Infrastructure 4.
  Two PostgreSQL-gated deletion tests were skipped in this ordinary run. The
  earlier dedicated five-test PostgreSQL run recorded above passed on an isolated
  fresh schema, including Vocabulary history retention and rollback proof.
- Twenty-five focused Workspace/VocabTable frontend tests passed. Updated the
  existing browser scenario's stale selectors, layout expectations and DELETE
  mock to the current UI/API. Both Playwright scenarios then passed on an
  isolated Vite server with mocked APIs at desktop and tablet widths, covering
  scroll/sticky layout and cancel/confirm of the exact Board deletion.
- This review did not exercise a live authenticated backend or the user's
  database. No commit, push or deployment was performed. Practice and Review
  were the next retained learning features to review separately.

## Review review (2026-10-09)

The retained Review flow matches the accepted Vocabulary → Practice → daily
Review path in the current checkout. No product-code change was needed.

- Inspected Review routes, service, repository, session/state entities, frontend
  setup/session/API, and Vocabulary deletion. The due queue includes only active,
  visible owned words due by the selected local date. A session persists one of
  three modes per word. Typed answers update the schedule once; pronunciation
  allows two assessed attempts. Deleting Vocabulary hides the related Review
  session, items, attempts, history, and state while retaining their rows.
- Updated two browser scenarios to use the current UI and API error shape.
  Mocked browser runs passed for due count → typed answer → completion and for
  provider failure → two pronunciation attempts → completion. This verifies
  frontend flow against mocked responses, not live Review persistence or speech.
- Focused tests passed: Domain 2, Application 6, Infrastructure 2, and frontend
  Review component 1. Three PostgreSQL-gated deletion tests skipped without the
  dedicated validation database. Scoped ESLint and diff checks passed.
- Review is locally assessed. Live PostgreSQL grading/scheduling, concurrent
  attempts, authenticated browser flow, and the separate Practice migration
  application remain unverified; do not claim production rollout completion.

## Fresh local baseline and final gates (2026-10-09)

The user chose the FluentA `fluenta_dev` database and explicitly discarded its
previous data. The old migration chain was replaced by
`20261009024221_InitialBaseline`; its source was saved temporarily outside the
repository before removal. The baseline was first applied to the isolated
`fluenta_baseline_validation` database. Its 29 tables included the retained
learning and Journal tables and excluded Pomodoro, Practice Settings,
Notifications, and Trash. A migration-backed integration test created a fresh
schema, wrote and read a User and Journal entry, and passed.

After verifying Docker Compose ownership and no other sessions, `fluenta_dev`
was dropped, recreated, and migrated. EF lists only the new baseline; the live
database contains 29 public tables, zero users, and none of the removed tables.
`has-pending-model-changes` passed. The ordinary backend suite passed 281 tests
with 17 environment-gated skips, and four dedicated Practice PostgreSQL tests
passed. The frontend build, lint, and 152 tests passed with one worker. The
previous five frontend failures and six lint errors were fixed; the default
parallel frontend test command is being rechecked before commit.

This is local database proof. The PR CI still references removed production
deployment files. Deployment policy and live R2/Azure/Google behavior have not
been validated here, so the migration plan remains active.
