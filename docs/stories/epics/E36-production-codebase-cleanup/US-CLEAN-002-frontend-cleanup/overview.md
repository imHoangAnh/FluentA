# US-CLEAN-002 Frontend Cleanup

## Goal

Remove confirmed frontend orphan components, dead API client exports, and
unused direct dependencies without changing current UI workflows.

## Acceptance Criteria

1. Orphan confirmation dialogs are deleted only after public-index, lazy-import,
   test, and runtime-reference checks.
2. Unused asset list/delete client paths and types are removed while presign and
   finalize flows remain intact.
3. Unused Tiptap/Lowlight packages are removed only after source and E2E scans;
   the lockfile remains consistent.
4. Frontend lint, typecheck, unit tests, build, and focused feature smoke pass.
