# US-CLEAN-003 Backend Cleanup

## Goal

Remove backend vertical slices and compatibility remnants that have no supported
consumer, while preserving all live API and provider workflows.

## Acceptance Criteria

1. Controller-to-application-to-infrastructure-to-frontend/E2E consumer maps are
   reviewed before each deletion.
2. Confirmed unused endpoint slices, obsolete AssetStatus aliases, and the
   unreferenced Worker remnant are removed with their dead contracts/tests.
3. Production providers, DI registrations, jobs, and active DTO contracts stay
   available.
4. API tests/build pass and removed endpoints return 404.
