# Validation

## Proof Strategy

Prove that Note pages can reuse the current Journal editor boundary and persist
through the real Note page update API while honoring the locked save contract:
save on blur, and save immediately before page switches.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit / Component | Dirty-state feedback, blur save, immediate page-switch save, save-failure draft retention, and editable blank-page open state with mocked Note API responses. |
| Route | Existing `/notes` route and shared Notes navigation continue to pass route-level regression coverage. |
| E2E | Optional only if focused component proof reveals an interaction gap that needs browser confirmation. |
| Platform | Windows PowerShell frontend Vitest and build remain the expected proof surface. |
| Performance | Not a dedicated target in this editor slice. |

## Commands

```text
npm --prefix src/frontend test -- --run src/App.test.tsx
npm --prefix src/frontend test -- --run src/routes/notes/NotesPage.test.tsx
npm --prefix src/frontend run build
```

## Feasibility Readiness

### Reality Gate

```text
REALITY GATE REPORT
Mode: high_risk_feature
Current work: Reuse the Journal editor for Note pages and add blur plus page-switch save behavior.
MODE FIT: PASS
REPO FIT: PASS
ASSUMPTIONS: PASS
SMALLER PATH: PASS
PROOF SURFACE: PASS
Decision: proceed
Evidence: current-story-pack.md; src/frontend/src/routes/notes/NotesPage.tsx; src/frontend/src/lib/api/note.api.ts; src/frontend/src/routes/journal/JournalPage.tsx; src/frontend/src/routes/journal/JournalRichTextEditor.tsx; docs/product/notes.md
```

### Feasibility Matrix

```text
FEASIBILITY MATRIX
Part / Assumption | Risk | Proof Required | Evidence | Result
Journal editor reuse is enough for first Note editing slice | Medium | Confirm Note can mount the same editor boundary without a second editor system | JournalRichTextEditor already exports a reusable content/disabled/onChange surface; NotesPage already owns the selected page detail panel that can host it | PASS
Note API already supports title/content persistence | Low | Confirm a Note update endpoint and contract exist | docs/product/notes.md and backend contract already expose PATCH /api/v1/notes/pages/{pageId} for supplied fields | PASS
Page-switch save can avoid stale-response overwrites | High | Confirm there is an existing request-order pattern to adapt and a place to sequence save-before-switch | JournalPage already uses openRequestRef and draftVersionRef guards; NotesPage already centralizes page selection and page detail queries | PASS
Focused Vitest coverage can prove blur save and failed-save draft retention | Medium | Confirm current frontend test style supports mocked mutation interactions | Existing route/component tests already use vi.mock plus userEvent for local save-flow assertions; NotesPage.test.tsx is already in place for this surface | PASS
```

### Constraints

- Do not expand into pasted or embedded image handling in this story.
- Keep save sequencing explicit and testable; page-switch save cannot rely on a
  delayed timer alone because `D1` requires immediate save as part of the switch.
- Preserve visible retry state when a Note save fails.

### Validation Outcome

`READY`

## Acceptance Evidence Captured

- `npm --prefix src/frontend test -- --run src/routes/notes/NotesPage.test.tsx`
  passed 5 focused Note route tests covering:
  editable blank-page open behavior,
  detail loading,
  blur save,
  save-status feedback,
  and save-before-switch behavior that keeps the draft visible when the first
  save attempt fails.
- `npm --prefix src/frontend test -- --run src/App.test.tsx` passed 12 route
  regression tests, keeping shared `/notes` route and Notes navigation coverage
  green.
- `npm --prefix src/frontend run build` passed after integrating the Note editor
  flow, with the existing SignalR/Rolldown warnings still present but
  non-blocking.
