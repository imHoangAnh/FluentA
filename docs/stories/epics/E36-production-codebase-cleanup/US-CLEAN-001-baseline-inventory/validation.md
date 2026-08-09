# US-CLEAN-001 Validation

## Planned Proof

- `rg` consumer/reference inventory for candidate source, routes, DI, jobs,
  config, exports, and packages.
- `npm run lint`, frontend tests, typecheck/build, and backend Release build/test.
- `git diff --check`.

## Evidence

- Frontend reference scans identified six confirmation-dialog files with only
  their own declaration reference, unused `listAssets`/`deleteAsset` exports,
  and Tiptap/Lowlight dependencies with no source or E2E imports. These remain
  deletion candidates for US-CLEAN-002 pending final public-index checks.
- Backend scans identified the unconsumed board page-list vertical slice,
  obsolete AssetStatus aliases, `CountdownEvent.RestoredAtUtc`, and the tracked
  Worker launch-profile remnant. These remain candidates for US-CLEAN-003/004
  pending indirect-use checks.
- `npm run lint`: passed with zero first-party warnings after fixing the
  Practice/Review keyboard-effect dependencies.
- `npm run test:run -- --maxWorkers=1`: 33 files and 137 tests passed.
- Focused Practice/Review/Profile proof: 2 files and 21 tests passed.
- `npm run build`: passed. Rolldown emitted only existing third-party SignalR
  pure-annotation warnings.
- `dotnet build src/backend/FluentA.slnx --configuration Release --no-restore
  --nologo`: passed with 0 warnings and 0 errors.
- `dotnet test src/backend/FluentA.slnx --configuration Release --no-build
  --nologo`: Domain 62/62 and Application 147/147 passed.
