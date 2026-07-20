# E32 Story Map

## Delivery Shape

| Story | Status | Outcome | Dependencies | Exit state |
| --- | --- | --- | --- | --- |
| `US-PR-001` | Implemented and reviewed | Practice and Review use backend-owned Azure pronunciation scoring, approved attempt rules and recap UI, dense Practice decks, and date-only Review state | Approved E32 context | API/domain/persistence/frontend contracts landed together; migration and browser flows are proven |

The work remains one story because splitting the provider API from the attempt
UI would create a non-demonstrable intermediate product, while splitting the
date DTO migration would temporarily leave Review clients and persistence on
incompatible contracts.

## Release Order

1. Add deterministic pronunciation ports, parser, DTOs, and tests.
2. Add the authorized API and Azure adapter behind disabled-by-default config.
3. Migrate Review state and all affected API projections to `DateOnly`.
4. Replace transcript UI and implement the approved Practice/Review rules.
5. Apply dense Practice library and shared recap presentation.
6. Reconcile product docs, run migration/browser/release proof, and close the
   Harness row only when every required proof flag is supported.
