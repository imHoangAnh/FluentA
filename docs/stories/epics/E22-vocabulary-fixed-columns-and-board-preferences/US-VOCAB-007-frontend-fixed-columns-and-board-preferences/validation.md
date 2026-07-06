# Validation

## Proof Strategy

This story is done when the frontend proves the Feature 21 table behavior:
fixed columns only, nullable hide/show, board-wide order and width persistence,
existing autosave/keyboard behavior preserved, and horizontal overflow working.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | API type/mapper compile coverage |
| Integration | none |
| E2E | none required if component and focused browser proof cover the contract |
| Platform | frontend lint, focused Vitest, build, optional focused Playwright |
| Performance | none |
| Logs/Audit | none |

## Fixtures

- One board with at least two pages.
- Nullable fixed-column preference toggles and persisted order/width values.

## Commands

```text
npm --prefix src/frontend run lint
npm --prefix src/frontend run test:run -- VocabTable
npm --prefix src/frontend run build
```

## Acceptance Evidence

Add results after verification.
