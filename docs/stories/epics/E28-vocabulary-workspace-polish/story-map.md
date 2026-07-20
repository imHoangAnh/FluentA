# E28 Story Map

| Order | Story | User-visible exit state | Depends on |
| --- | --- | --- | --- |
| 1 | `US-UI-006` Compact AppShell and stabilize Vocabulary viewport | Every AppShell route uses the compact approved header/sidebar, while Vocabulary keeps its rail, toolbar, column header, and word rows in independent usable scroll regions with wrapped content. | Approved E28 context |
| 2 | `US-VOCAB-009` Safe Vocabulary deletion and success feedback | Board/Page right-click deletion and Word deletion use accessible confirmation, select the correct replacement after success, and show only the approved create/delete success toasts. | `US-UI-006` validated |
| 3 | `US-VOCAB-010` Modal creation and expanded Word classes | Board/Page creation uses accessible modal forms, `Add page` remains above the active Board's Pages, and six additional Word classes are available end to end. | `US-VOCAB-009` implemented |

## Current Story

`US-UI-006` is implemented and its focused component, Chromium, lint, build,
and documentation evidence is recorded in its validation report.

`US-VOCAB-010` is implemented. Its focused component/application proof, full
unit suites, production bundle, mocked-API Chromium regression, and documented
platform constraints are recorded in its validation report.

## Completion Rule

E28 is complete only when all stories have their observable exit states,
product documentation matches the shipped interaction contract, focused
desktop/tablet Chromium proof passes, and Harness rows contain truthful unit,
integration, E2E, and platform evidence.
