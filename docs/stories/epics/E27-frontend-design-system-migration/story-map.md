# E27 Story Map

| Order | Story | User-visible exit state | Depends on | Approval milestone |
| --- | --- | --- | --- | --- |
| 1 | `US-UI-001` Foundation, AppShell, Dashboard, and Vocabulary | The running app has the approved Geist/teal design language, shared desktop/tablet shell, redesigned Dashboard, and fully functional redesigned Vocabulary experience. | Approved E27 context | 1 |
| 2 | `US-UI-002` Authentication and learning flows | Authentication, Flashcards, Practice, and Review use the approved system without changing route or learning behavior. | `US-UI-001` approved | 2 |
| 3 | `US-UI-003` Productivity flows | Todo, Habits, Countdowns, Kanban, and Pomodoro use the shared shell/primitives and preserve current interactions and realtime behavior. | `US-UI-002` approved | 3 |
| 4 | `US-UI-004` Content and account flows | Journal, Notes, Notifications, and Settings are migrated, including editor/upload/account states. | `US-UI-003` approved | 4 |
| 5 | `US-UI-005` Legacy CSS retirement and release proof | Superseded CSS/inline presentation is removed, all protected routes remain reachable, Chromium regression proof passes, docs/decision/Harness records agree. | `US-UI-004` approved | 5 |

## Current Story

`US-UI-004` is the next implementation milestone and now has a complete
high-risk planning packet. It migrates Journal, Notes, Notifications, and
Settings after the implemented `US-UI-003` productivity milestone. No
`US-UI-004` source implementation has started.

`US-UI-005` is also planned, but its implementation is hard-gated on running
`US-UI-004` proof and user approval. It retires the temporary legacy CSS bridge,
runs full Chromium release proof, and reconciles all five E27 story packets and
Harness rows. The current `in_progress` rows for `US-UI-001` and `US-UI-002`
must be reviewed from their own evidence during that closeout rather than
inferred complete from later milestone work.

## Dependency Rule

Do not begin the next story until the user approves the current milestone.
Later stories must consume the approved components and tokens rather than
forking a new visual language.
