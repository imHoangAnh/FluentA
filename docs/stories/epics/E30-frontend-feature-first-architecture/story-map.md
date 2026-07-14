# E30 Story Map

| Order | Phase | Story | Lane | Observable exit state | Depends on |
| --- | --- | --- | --- | --- | --- |
| 1 | Foundation / Platform and Identity | `US-FE-001` Application foundation, Auth, and protected composition | high-risk | The SPA runs through `createBrowserRouter`/`RouterProvider`, Auth and shared infrastructure have canonical owners, every existing route remains reachable, and the temporary migration manifest is explicit. | Approved E30 context |
| 2 | Platform and Identity | `US-FE-002` Dashboard feature boundary | normal | `/` runs from `features/dashboard`, keeps all widget/query behavior, and no Dashboard source remains under legacy paths. | `US-FE-001` |
| 3 | Platform and Identity | `US-FE-003` Settings feature composition | high-risk | All `/settings/*` routes run from `features/settings`, while Profile/Assets, Practice, Review, and Level 5 calls use their owning public APIs without contract changes. | `US-FE-002` |
| 4 | Platform and Identity | `US-FE-004` Notifications feature boundary | normal | `/notifications` and notification API/UI ownership live in `features/notifications` with unchanged unread/mark behavior. | `US-FE-003` |
| 5 | Learning | `US-FE-005` Vocabulary feature boundary | high-risk | `/vocabulary`, table behavior, board/page CRUD, autosave, settings, API, types, and tests live in `features/vocabulary`. | `US-FE-004` |
| 6 | Learning | `US-FE-006` Flashcards feature boundary | normal | `/flashcards` and `/flashcards/pages/:pageId`, deck library/viewer, API subset, realtime, and tests live in `features/flashcards`. | `US-FE-005` |
| 7 | Learning | `US-FE-007` Practice feature boundary | high-risk | `/practice` and `/practice/:pageId`, modal launch/session logic, Practice API/settings contracts, hooks, types, and tests live in `features/practice`. | `US-FE-006` |
| 8 | Learning | `US-FE-008` Review feature boundary | high-risk | `/review`, Review settings/dashboard/session API and UI ownership, hooks, types, and tests live in `features/review`. | `US-FE-007` |
| 9 | Planning | `US-FE-009` Todo feature boundary | normal | `/todo`, day/week planning, Todo API, realtime invalidation, and tests live in `features/todo`. | `US-FE-008` |
| 10 | Planning | `US-FE-010` Kanban feature boundary | high-risk | `/kanban`, board/column/card UI, drag-and-drop, API, realtime, and tests live in `features/kanban`. | `US-FE-009` |
| 11 | Writing | `US-FE-011` Journal feature boundary | high-risk | `/journal`, rich-text editor, autosave/search/date logic, API, and tests live in `features/journal`. | `US-FE-010` |
| 12 | Writing | `US-FE-012` Notes feature boundary | high-risk | `/notes`, board/page/editor/assets behavior, API, CSS Module, and tests live in `features/notes`. | `US-FE-011` |
| 13 | Focus and Time | `US-FE-013` Pomodoro feature boundary | high-risk | `/pomodoro`, timer state, API, realtime synchronization, and tests live in `features/pomodoro`. | `US-FE-012` |
| 14 | Focus and Time | `US-FE-014` Countdown feature boundary | normal | `/countdowns`, event/reminder behavior, API, and tests live in `features/countdown`. | `US-FE-013` |
| 15 | Habit Tracking | `US-FE-015` Habits feature boundary | high-risk | `/habits` and `/habits/:habitId/stats`, semantic icons, API, realtime, and tests live in `features/habits`. | `US-FE-014` |
| 16 | Final Cleanup | `US-FE-016` Legacy boundary retirement and release proof | high-risk | Temporary route/import allowlists and superseded `routes`, `components`, `lib`, and `stores` ownership paths are gone; global boundary checks, route regression, docs, decision, and Harness records agree. | `US-FE-015` |

## Phase Checkpoints

- A phase groups related domain work for planning and review; it does not merge
  feature folders or waive per-feature verification.
- Do not begin the next story while the current story has unresolved migration
  failures.
- Each feature story must remove its own old source path before it is marked
  implemented.
- `US-FE-016` is proof and cleanup, not a place to defer unfinished feature
  ownership.

## Current Story

`US-FE-001` through `US-FE-005` are implemented, reviewed, verified, and
locally committed. `US-FE-006` is the active story. Do not start `US-FE-007`
until US-FE-006 has its own verified local smart commit.
