# Contract Map: Backend Bounded Context Split

## Scope

This map is the execution output for `US-BC-001`. It records the current
mixed Flashcards backend surface and assigns each contract to the target
Flashcard, Practice, or Review bounded context for Feature 20.

This story is runtime-neutral. It does not move source code, change endpoints,
change EF mappings, or update frontend code.

## Target Context Rules

| Context | Owns | Must not own |
| --- | --- | --- |
| Flashcard | Page deck/card read model, deck/card sync from Vocabulary, viewer session reads. | Practice summaries, Practice settings, SRS state/history, Review settings, SRS scheduling, dashboard stats. |
| Practice | Practice settings, practice session summaries, Practice workflow persistence, Add to Review command surface. | Direct Review table writes, SRS scheduling, due queues, dashboard stats. |
| Review | Review settings, due queue, Review sessions, Review answers, SRS state/history, FluentA SRS scheduler, dashboard/stats. | Flashcard viewer behavior and Practice attempt/summary persistence. |
| Vocabulary | Vocabulary words/pages/boards as source content. | Direct imports of target context internals after sync handlers/ports are introduced. |

## Endpoint Map

Current controller: `src/backend/FluentA.API/Controllers/FlashcardsController.cs`.

| Current endpoint | Current action | Target endpoint family | Target controller | Target app service | Later story | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `GET /api/v1/flashcards/decks` | `ListDecks` | `GET /api/v1/flashcards/decks` | `FlashcardsController` | `IFlashcardService.ListDecksAsync` | `US-BC-005` | Keep route shape; implementation must only read Flashcard deck/card model. |
| `GET /api/v1/flashcards/decks/{deckId}/cards` | `GetDeckSession` | `GET /api/v1/flashcards/decks/{deckId}/cards` | `FlashcardsController` | `IFlashcardService.GetDeckSessionAsync` | `US-BC-005` | Keep route shape; output may include Review-owned read projections through explicit DTO mapping. |
| `POST /api/v1/flashcards/practice-sessions` | `CreatePracticeSessionSummary` | `POST /api/v1/practice/sessions` | `PracticeController` | `IPracticeService.CreatePracticeSessionSummaryAsync` | `US-BC-005`, `US-BC-006` | Remove old Flashcards route during cutover. |
| `POST /api/v1/practice/add-to-review` | `AddPracticeWordsToReview` | `POST /api/v1/practice/add-to-review` | `PracticeController` | `IPracticeService.AddPracticeWordsToReviewAsync` | `US-BC-005` | Endpoint may stay under Practice, but implementation must call Review through `IReviewEnrollmentPort`. |
| `POST /api/v1/review/sessions` | `CreateReviewSession` | `POST /api/v1/review/sessions` | `ReviewController` | `IReviewService.CreateReviewSessionAsync` | `US-BC-005` | Keep target-shaped route. |
| `POST /api/v1/flashcards/sessions` | `CreateReviewSession` compatibility route | removed | none | none | `US-BC-005`, `US-BC-006` | Must be unreachable after cutover. Tests still reference this route in `page-deck-active-recall.spec.js`. |
| `GET /api/v1/review/sessions/{sessionId}/summary` | `GetReviewSessionSummary` | same | `ReviewController` | `IReviewService.GetReviewSessionSummaryAsync` | `US-BC-005` | Keep target-shaped route. |
| `GET /api/v1/flashcards/sessions/{sessionId}/summary` | `GetReviewSessionSummary` compatibility route | removed | none | none | `US-BC-005`, `US-BC-006` | Must be unreachable after cutover. |
| `GET /api/v1/flashcards/dashboard` | `GetDashboard` | `GET /api/v1/review/dashboard` | `ReviewController` | `IReviewService.GetDashboardAsync` | `US-BC-005`, `US-BC-006` | Dashboard/stats ownership moves to Review. |
| `GET /api/v1/flashcards/dashboard/{boardId}` | `GetBoardDashboard` | `GET /api/v1/review/dashboard/{boardId}` | `ReviewController` | `IReviewService.GetDashboardAsync` | `US-BC-005`, `US-BC-006` | Preserve board filtering and `timeZoneId`. |
| `GET /api/v1/flashcards/practice-settings` | `GetPracticeSettings` legacy Flashcards route | removed | none | none | `US-BC-005`, `US-BC-006` | Current frontend already uses `/practice/settings`; remove old route. |
| `PUT /api/v1/flashcards/practice-settings` | `UpdatePracticeSettings` legacy Flashcards route | removed | none | none | `US-BC-005`, `US-BC-006` | Current frontend already uses `/practice/settings`; remove old route. |
| `GET /api/v1/practice/settings` | routed through current FlashcardsController absolute route | same | `PracticeController` | `IPracticeService.GetPracticeSettingsAsync` | `US-BC-005` | Add explicit controller; remove dependency on Flashcards controller. |
| `PUT /api/v1/practice/settings` | routed through current FlashcardsController absolute route | same | `PracticeController` | `IPracticeService.UpdatePracticeSettingsAsync` | `US-BC-005` | Preserve validation behavior. |
| `GET /api/v1/flashcards/settings` | `GetReviewSettings` legacy Flashcards route | removed | none | none | `US-BC-005`, `US-BC-006` | Current frontend already uses `/review/settings`; remove old route. |
| `PUT /api/v1/flashcards/settings` | `UpdateReviewSettings` legacy Flashcards route | removed | none | none | `US-BC-005`, `US-BC-006` | Current frontend already uses `/review/settings`; remove old route. |
| `GET /api/v1/review/settings` | routed through current FlashcardsController absolute route | same | `ReviewController` | `IReviewService.GetReviewSettingsAsync` | `US-BC-005` | Add explicit controller; remove dependency on Flashcards controller. |
| `PUT /api/v1/review/settings` | routed through current FlashcardsController absolute route | same | `ReviewController` | `IReviewService.UpdateReviewSettingsAsync` | `US-BC-005` | Preserve validation behavior. |
| `POST /api/v1/review` | `SubmitReview` | `POST /api/v1/review` | `ReviewController` | `IReviewService.SubmitReviewAsync` | `US-BC-005` | Keep target-shaped route. |
| `POST /api/v1/flashcards/review` | `SubmitReview` compatibility route | removed | none | none | `US-BC-005`, `US-BC-006` | Must be unreachable after cutover. Tests still reference this route in `page-deck-active-recall.spec.js`. |

## Controller And Dependency Injection Map

| Current surface | Target owner | Later story | Notes |
| --- | --- | --- | --- |
| `FlashcardsController` injects `IFlashcardService` for all learning actions. | Split into `FlashcardsController`, `PracticeController`, `ReviewController`. | `US-BC-005` | Each controller calls only its matching context service. |
| `SettingsController` injects `IFlashcardService` for learning settings aggregate. | Split dependency to Practice and Review services or a settings composition layer that calls their public contracts. | `US-BC-005`, `US-BC-006` | Do not reintroduce a mixed Flashcard facade. |
| `DependencyInjection` registers `IFlashcardRepository/EfFlashcardRepository` and `IFlashcardService/FlashcardService`. | Register `IFlashcardRepository/IFlashcardService`, `IPracticeRepository/IPracticeService`, `IReviewRepository/IReviewService`, and `IReviewEnrollmentPort`. | `US-BC-002`, `US-BC-003` | Avoid keeping old mixed service as a facade. |
| `Program.cs` registers `IFlashcardSyncNotifier`. | Keep notification contract with Flashcard ownership, or rename only if frontend SignalR contract changes are explicitly planned. | `US-BC-007` | Notification naming may stay Flashcard-specific because it notifies deck/card updates. |

## DTO And Contract Ownership Map

Current DTO file: `src/backend/FluentA.Application/BoundedContexts/Flashcards/DTOs/FlashcardDtos.cs`.

| Current DTO/enum | Target context | Later story | Notes |
| --- | --- | --- | --- |
| `FlashcardCardDto` | Flashcard | `US-BC-002` | Viewer/deck card projection. If Review fields stay in output, map from Review read contract explicitly. |
| `FlashcardDeckDto` | Flashcard | `US-BC-002` | Deck list projection. |
| `DeckSessionDto` | Flashcard | `US-BC-002` | Viewer session/card read contract. |
| `CreatePracticeSessionSummaryRequest` | Practice | `US-BC-002` | Rename only if endpoint naming changes require it. |
| `PracticeSessionSummaryDto` | Practice | `US-BC-002` | Practice persistence result. |
| `PracticeSessionSummarySaveStatus` | Practice | `US-BC-002` | Practice validation result. |
| `PracticeSessionSummarySaveResult` | Practice | `US-BC-002` | Repository/application boundary. |
| `PracticeSettingsDto` | Practice | `US-BC-002` | Practice settings contract. |
| `UpdatePracticeSettingsRequest` | Practice | `US-BC-002` | Practice settings command. |
| `AddPracticeWordsToReviewRequest` | Practice | `US-BC-002` | Practice command input. |
| `AddPracticeWordsToReviewDto` | Practice response, Review enrollment result | `US-BC-002` | Practice owns HTTP response; Review owns state creation through a port result mapped back to Practice. |
| `CreateReviewSessionRequest` | Review | `US-BC-002` | Review session command. |
| `ReviewSessionCreatedDto` | Review | `US-BC-002` | Review session result. |
| `ReviewSessionWordDto` | Review | `US-BC-002` | Review queue projection; contains vocabulary/card content copied for review. |
| `ReviewSessionSummaryDto` | Review | `US-BC-002` | Review summary projection. |
| `ReviewSettingsDto` | Review | `US-BC-002` | Review settings contract. |
| `UpdateReviewSettingsRequest` | Review | `US-BC-002` | Review settings command. |
| `DashboardForecastPointDto` | Review | `US-BC-002` | Dashboard/stats projection. |
| `FlashcardDashboardDto` | Review | `US-BC-002` | Rename to Review/Learning dashboard DTO during cutover. |
| `SubmitReviewRequest` | Review | `US-BC-002` | Review answer command. |
| `ReviewResultDto` | Review | `US-BC-002` | SRS scheduling result. |
| `FlashcardError`, `OperationResult<...>` usage | Context-local application errors | `US-BC-002` | Do not share Flashcard-specific error naming across Practice/Review. |
| `ReviewTime` | Review, with optional Practice-local duplicate for completed-at dates | `US-BC-002` | No shared Learning kernel; duplicate small helpers if needed. |

## Application Service Map

Current service: `IFlashcardService` / `FlashcardService`.

| Current method | Target service | Later story | Notes |
| --- | --- | --- | --- |
| `ListDecksAsync` | `IFlashcardService` | `US-BC-002` | Read Flashcard deck/card model only. |
| `GetDeckSessionAsync` | `IFlashcardService` | `US-BC-002` | Preserve owner/deleted filtering. |
| `CreatePracticeSessionSummaryAsync` | `IPracticeService` | `US-BC-002` | Preserve validation for deck ownership and summary totals. |
| `AddPracticeWordsToReviewAsync` | `IPracticeService` calling `IReviewEnrollmentPort` | `US-BC-002` | Practice validates deck/workflow; Review owns missing Level 0 state creation. |
| `CreateReviewSessionAsync` | `IReviewService` | `US-BC-002` | Review owns due queue, random/review mode selection, and session id. |
| `GetReviewSessionSummaryAsync` | `IReviewService` | `US-BC-002` | Review owns history aggregation. |
| `GetPracticeSettingsAsync` | `IPracticeService` | `US-BC-002` | Practice settings only. |
| `UpdatePracticeSettingsAsync` | `IPracticeService` | `US-BC-002` | Preserve mode sequence validation. |
| `GetReviewSettingsAsync` | `IReviewService` | `US-BC-002` | Review settings only. |
| `UpdateReviewSettingsAsync` | `IReviewService` | `US-BC-002` | Preserve daily limit and recap validation. |
| `GetDashboardAsync` | `IReviewService` | `US-BC-002` | Dashboard/stats are Review-owned. |
| `SubmitReviewAsync` | `IReviewService` | `US-BC-002` | Review owns answer validation, history write, state update, and scheduling. |

## Repository And Persistence Method Map

Current repository: `IFlashcardRepository` / `EfFlashcardRepository`.

| Current method | Target repository/port | Later story | Notes |
| --- | --- | --- | --- |
| `ListDecksAsync` | `IFlashcardRepository.ListDecksAsync` | `US-BC-003` | Reads `flashcards.decks/cards`; may include Review read projection only through explicit contract. |
| `GetDeckSessionAsync` | `IFlashcardRepository.GetDeckSessionAsync` | `US-BC-003` | Deck/card read model. |
| `CreatePracticeSessionSummaryAsync` | `IPracticeRepository.CreatePracticeSessionSummaryAsync` | `US-BC-003` | Writes `practice.session_summaries`. |
| `AddPracticeWordsToReviewAsync` | `IReviewEnrollmentPort.EnrollMissingWordsAsync` implemented by Review | `US-BC-003` | Current method writes Review state inside Flashcard repository; must move to Review. |
| `CreateReviewSessionAsync` | `IReviewRepository.CreateReviewSessionAsync` | `US-BC-003` | Owns due queue, order type, mode/random behavior, state scheduling side effects. |
| `GetReviewSessionSummaryAsync` | `IReviewRepository.GetReviewSessionSummaryAsync` | `US-BC-003` | Aggregates Review history. |
| `GetPracticeSettingsAsync` | `IPracticeRepository.GetPracticeSettingsAsync` | `US-BC-003` | Lazy default creation remains Practice-owned. |
| `UpdatePracticeSettingsAsync` | `IPracticeRepository.UpdatePracticeSettingsAsync` | `US-BC-003` | Writes `practice.settings`. |
| `GetReviewSettingsAsync` | `IReviewRepository.GetReviewSettingsAsync` | `US-BC-003` | Lazy default creation remains Review-owned. |
| `UpdateReviewSettingsAsync` | `IReviewRepository.UpdateReviewSettingsAsync` | `US-BC-003` | Writes `review.settings`. |
| `GetDashboardAsync` | `IReviewRepository.GetDashboardAsync` | `US-BC-003` | Due/overdue, retention, forecast, streak, board stats. |
| `AddReviewAsync` | `IReviewRepository.AddReviewAsync` | `US-BC-003` | Writes `review.word_histories`, updates `review.word_states`. |
| `PickRandomReviewMode` | Review repository/service helper | `US-BC-003` | Preserve random mode semantics; do not change Feature 19 behavior. |
| `CountCurrentStreakAsync`, `HasReviewOnLocalDateAsync`, `Percentage` | Review repository/dashboard helpers | `US-BC-003` | Keep under Review. |
| `ToCardDto` | Flashcard mapper or explicit projection mapper | `US-BC-003` | Split if Review state fields stay visible on Flashcard card DTO. |

## Domain Ownership Map

Current folder: `src/backend/FluentA.Domain/BoundedContexts/Flashcards`.

| Current type | Target owner | Later story | Notes |
| --- | --- | --- | --- |
| `FlashcardDeck` | Flashcard | `US-BC-002` | Maps to `flashcards.decks`. |
| `FlashcardCard` | Flashcard | `US-BC-002` | Maps to `flashcards.cards`; old SM-2 fields should be reviewed during implementation because Review owns SRS state now. |
| `DeckType` | Flashcard | `US-BC-002` | Page deck/read model type. |
| `PracticeSettings` | Practice | `US-BC-002` | Maps to `practice.settings`. |
| `PracticeSessionSummary` | Practice | `US-BC-002` | Maps to `practice.session_summaries`. |
| `PracticeMode` | Practice | `US-BC-002` | Duplicate/map if Review also needs a mode string; no shared Learning kernel. |
| `ReviewSettings` | Review | `US-BC-002` | Maps to `review.settings`. |
| `WordReviewState` | Review | `US-BC-002` | Maps to `review.word_states`; Review-only writer. |
| `WordReviewHistory` | Review | `US-BC-002` | Maps to `review.word_histories`; Review-only writer. |
| `FluentAsrsReviewResult` | Review | `US-BC-002` | Review scheduling result enum. |
| `FluentAsrsScheduler` and `FluentAsrsResult` | Review | `US-BC-002` | Review owns scheduling. |
| `CardReview` | Review legacy candidate | `US-BC-002` | Verify whether still used. If unused legacy SM-2 type, remove in split story. |
| `CardState` | Flashcard legacy candidate | `US-BC-002` | Current `FlashcardCard` still maps `State`; verify whether this is superseded by Review state. |
| `ReviewRating` | Review legacy candidate | `US-BC-002` | Verify usage and remove/map during Review domain split. |

## EF Table And Schema Ownership Map

Current `DbSet` declarations live in `AppDbContext`. Current configurations map
tables without context schemas.

| Current table/configuration | Current type | Target table | Target context | Later story | Notes |
| --- | --- | --- | --- | --- | --- |
| `flashcard_decks` / `FlashcardDeckConfiguration` | `FlashcardDeck` | `flashcards.decks` | Flashcard | `US-BC-004` | Preserve indexes on `(user_id, board_id)`, `(board_id, type)`, and unique filtered `page_id`. |
| `flashcard_cards` / `FlashcardCardConfiguration` | `FlashcardCard` | `flashcards.cards` | Flashcard | `US-BC-004` | Preserve unique `(deck_id, word_id)` and `word_id`. Review-state-derived card fields need explicit migration decision. |
| `practice_settings` / `PracticeSettingsConfiguration` | `PracticeSettings` | `practice.settings` | Practice | `US-BC-004` | Preserve unique `user_id` and user FK. |
| `practice_session_summaries` / `PracticeSessionSummaryConfiguration` | `PracticeSessionSummary` | `practice.session_summaries` | Practice | `US-BC-004` | Preserve user/deck FKs and indexes on `(user_id, completed_at)`, `(deck_id, completed_at)`. |
| `review_settings` / `ReviewSettingsConfiguration` | `ReviewSettings` | `review.settings` | Review | `US-BC-004` | Preserve unique `user_id` and user FK. |
| `word_review_states` / `WordReviewStateConfiguration` | `WordReviewState` | `review.word_states` | Review | `US-BC-004` | Preserve unique `word_id`, `(user_id, next_review_date)` index, and VocabWord FK. |
| `word_review_histories` / `WordReviewHistoryConfiguration` | `WordReviewHistory` | `review.word_histories` | Review | `US-BC-004` | Preserve indexes `(user_id, session_id)`, `(user_id, reviewed_at)`, `(word_id, reviewed_at)`. |
| `card_reviews` migration/model remnants | `CardReview` | remove or `review.card_reviews` if still required | Review legacy candidate | `US-BC-004` | Must be resolved by usage scan before migration. |

Migration posture:

- Dev/local Feature 20 implementation may use destructive reset migration
  because the app is pre-production.
- Any production/user-data deployment must add or verify a preserve-data path
  before release. It must preserve deck/card content, practice summaries,
  settings, Review state, and Review history.

## Frontend API And Test Call-Site Map

Primary client: `src/frontend/src/lib/api/flashcard.api.ts`.

| Current frontend call | Target call | Later story | Notes |
| --- | --- | --- | --- |
| `getDecks` -> `/flashcards/decks` | same | `US-BC-006` | Flashcard. |
| `getDeckSession` -> `/flashcards/decks/{deckId}/cards` | same | `US-BC-006` | Flashcard. |
| `createPracticeSessionSummary` -> `/flashcards/practice-sessions` | `/practice/sessions` | `US-BC-006` | Practice endpoint cutover. |
| `addPracticeWordsToReview` -> `/practice/add-to-review` | same | `US-BC-006` | Practice endpoint with Review port behind it. |
| `createReviewSession` -> `/review/sessions` | same | `US-BC-006` | Review. |
| `getReviewSessionSummary` -> `/review/sessions/{sessionId}/summary` | same | `US-BC-006` | Review. |
| `getDashboard` -> `/flashcards/dashboard...` | `/review/dashboard...` | `US-BC-006` | Review dashboard/stats ownership. |
| `getPracticeSettings` / `updatePracticeSettings` -> `/practice/settings` | same | `US-BC-006` | Practice. |
| `getReviewSettings` / `updateReviewSettings` -> `/review/settings` | same | `US-BC-006` | Review. |
| `submitReview` -> `/review` | same | `US-BC-006` | Review. |

Test/call-site groups to update or verify in `US-BC-006`:

- `flashcard-practice.spec.js`, `practice-workflow.spec.js`,
  `all-words-sm2.spec.js`, and `page-deck-active-recall.spec.js` reference
  `/api/v1/flashcards/practice-sessions`.
- `page-deck-active-recall.spec.js` still references legacy
  `/api/v1/flashcards/sessions`, `/api/v1/flashcards/sessions/{id}/summary`,
  and `/api/v1/flashcards/review`; these must be removed or rewritten.
- `spaced-daily-planning.spec.js` references `/api/v1/flashcards/dashboard`.
- `review-workflow.spec.js` already uses target-shaped `/review` and
  `/review/sessions` routes, but still seeds decks from `/flashcards/decks`.
- `App.tsx`, `LearningNavLinks.tsx`, and route files use product routes
  `/flashcards`, `/flashcards/practice`, `/flashcards/decks/:deckId`,
  `/flashcards/decks/:deckId/practice`, and `/review`; Feature 20 does not
  require product route changes unless endpoint cutover exposes stale naming.

## Vocabulary Sync And Cleanup Map

Current coupling:

- `VocabularyService` imports `FluentA.Application.BoundedContexts.Flashcards`
  and `FluentA.Domain.BoundedContexts.Flashcards.Entities`.
- `VocabularyService.CreatePageAsync` creates a `FlashcardDeck` directly.
- `IVocabularyRepository.AddPageWithDeckAsync` accepts a `FlashcardDeck`.
- `EfVocabularyRepository` imports Flashcard entities and reads/writes
  `_dbContext.FlashcardDecks`, `_dbContext.FlashcardCards`, and
  `_dbContext.WordReviewStates`.

Target split:

| Current behavior | Target owner | Later story | Notes |
| --- | --- | --- | --- |
| Creating a page creates a page deck. | Flashcard handler/port | `US-BC-007` | Vocabulary should emit/dispatch a page-created event or call an explicit Flashcard sync port. |
| Creating/updating active words creates or updates cards. | Flashcard handler/port | `US-BC-007` | Flashcard owns deck/card sync. |
| Deleting words removes cards. | Flashcard handler/port | `US-BC-007` | Preserve owner scope and deleted-row non-disclosure. |
| Deleting words removes `WordReviewState`. | Review handler/port | `US-BC-007` | Current code removes states directly from Vocabulary repository; Review must own cleanup, including histories if required by deletion rules. |
| Same-transaction guarantees. | In-process synchronous handlers/ports by default | `US-BC-007` | Do not add broker/outbox unless validation proves synchronous handlers cannot preserve current behavior. |

## Later Story Assignments

| Story | Uses this map for |
| --- | --- |
| `US-BC-002` | Domain/application namespaces, DTO split, service/port split, legacy type cleanup. |
| `US-BC-003` | Repository split, EF query/write ownership, Practice-to-Review enrollment port implementation. |
| `US-BC-004` | PostgreSQL schema move, migration posture, table/index/FK preservation. |
| `US-BC-005` | Controller split, endpoint cutover, legacy route removal, DI update. |
| `US-BC-006` | Frontend client, route flow, settings/dashboard usage, Vitest and Playwright cutover. |
| `US-BC-007` | Vocabulary sync/cleanup handler split and atomicity proof. |
| `US-BC-008` | Release proof across context boundaries, endpoint removal, schema ownership, and workflow regressions. |

## Static Evidence Commands

The map was built from these inspections:

```text
rg -n "\[(Route|HttpGet|HttpPost|HttpPut|HttpDelete).*\]|public async Task|public Task|public sealed class|private static" src/backend/FluentA.API/Controllers/FlashcardsController.cs src/backend/FluentA.Application/BoundedContexts/Flashcards src/backend/FluentA.Infrastructure/Flashcards/EfFlashcardRepository.cs -S
rg -n "record |class |enum |public sealed class|public enum" src/backend/FluentA.Application/BoundedContexts/Flashcards src/backend/FluentA.Domain/BoundedContexts/Flashcards -S
rg -n "ToTable\(|HasIndex|HasForeignKey|HasOne|Property\(" src/backend/FluentA.Infrastructure/Persistence/Configurations -g "*Flashcard*.cs" -g "*Practice*.cs" -g "*Review*.cs" -S
rg -n "/flashcards|/practice|/review|/api/v1/flashcards|/api/v1/practice|/api/v1/review" src/frontend/src src/frontend/e2e -S
rg -n "using FluentA\.(Application|Domain)\.BoundedContexts\.Flashcards|FlashcardDeck|FlashcardCard|WordReviewState|WordReviewHistory|PracticeSessionSummary|ReviewSettings|PracticeSettings" src/backend/FluentA.Application/BoundedContexts/Vocabulary src/backend/FluentA.Infrastructure/Vocabulary -S
```

## Completion Criteria For This Story

- This `contract-map.md` exists and covers every required section from
  `design.md`.
- Harness story `US-BC-001` is updated with evidence.
- Verification records static/docs proof only; runtime build/test proof belongs
  to implementation stories.
