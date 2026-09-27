# Execution Plan: Backend Structure Reorganization

Date: 2026-08-17

## Status

Completed.

## Outcome

Reorganize the existing FluentA backend into a predictable Clean Architecture
layout inspired by the approved reference tree while preserving the current
four-project modular monolith, bounded-context ownership, dependency direction,
public API, database model, runtime behavior, and deployment topology.

The observable result is:

- `FluentA.API` has a small composition entry point and transport/hosting
  concerns grouped by responsibility;
- `FluentA.Application` remains feature-first through its existing bounded
  contexts, ports, DTOs, validators, mappers, errors, and service facades;
- `FluentA.Domain` remains framework-neutral and feature-owned;
- `FluentA.Infrastructure` groups persistence and external implementations by
  technical responsibility without obscuring feature ownership;
- production and test project references retain their current direction; and
- build, tests, architecture boundaries, API contracts, Hangfire registration,
  SignalR contracts, and EF model-drift checks remain green.

## Context

- Repository workflow: `docs/WORKFLOW.md`.
- Repository instructions: `AGENTS.md`.
- Backend current-state documentation: `src/backend/README.md`.
- Backend solution: `src/backend/FluentA.slnx`.
- Approved dependency checks:
  `src/backend/FluentA.API.UnitTests/ArchitectureBoundaryTests.cs`.
- Existing backend decomposition constraints:
  `docs/plans/completed/backend-internal-decomposition.md`.
- API composition root: `src/backend/FluentA.API/Program.cs`.
- Infrastructure composition:
  `src/backend/FluentA.Infrastructure/DependencyInjection.cs` and
  `src/backend/FluentA.Infrastructure/FeatureServiceRegistrationExtensions.cs`.
- Shared persistence:
  `src/backend/FluentA.Infrastructure/Persistence/AppDbContext.cs`.

`AGENTS.md` references `docs/patterns/encoding-invariants.md`, but that file is
currently absent. This plan therefore enforces only rules already encoded by
the current project references, architecture tests, backend documentation, and
accepted backend decomposition plan. Missing invariant guidance is not
silently reconstructed.

## Scope

In scope:

- Preserve these production projects:
  `FluentA.API`, `FluentA.Application`, `FluentA.Domain`, and
  `FluentA.Infrastructure`.
- Preserve the current four layer-owned test projects and their solution
  membership.
- Extract existing API startup/configuration code from `Program.cs` into small
  concern-owned extensions or middleware while preserving middleware and
  endpoint ordering.
- Rename or move API hosting folders only where the new name describes current
  behavior, such as `Health` to `HealthChecks`.
- Keep `ApiEnvelope` and other HTTP transport contracts in API.
- Keep `OperationResult`, application errors, repository/provider ports, DTOs,
  validators, mappers, and service facades in Application.
- Keep `BoundedContexts` as the feature ownership boundary in Application and
  Domain; do not perform a cosmetic rename to `Features`.
- Group EF repositories and transactions beneath Infrastructure persistence
  folders while retaining feature-specific subfolders.
- Group existing Infrastructure implementations under current capabilities:
  identity, email, object storage, caching, content processing, external
  services, background jobs, and persistence.
- Split the existing registration implementation by responsibility while
  preserving the public `AddFluentAInfrastructure` composition entry point.
- Update namespaces, imports, tests, and current-state documentation required by
  moved files.
- Strengthen architecture tests when a new folder/namespace boundary is
  important enough to prevent regression.

Out of scope:

- New production projects, including `FluentA.Worker` or
  `FluentA.Contracts`.
- Activating the stale `FluentA.Worker` build-artifact directory.
- CQRS, MediatR, command/query handlers, pipeline behaviors, or one class per
  endpoint/method.
- `IApplicationDbContext` or direct Application access to EF Core.
- Moving HTTP envelopes into Application.
- New generic paging, permission, exception, filter, correlation-ID, caching,
  email, file-storage, or integration-event abstractions without an existing
  consumer and accepted behavior.
- Database schema or migration changes.
- API route, payload, envelope, status-code, auth-cookie, OpenAPI, SignalR, or
  Hangfire contract changes.
- Splitting PostgreSQL or `AppDbContext` by bounded context.
- Moving Hangfire into a separate process or changing runtime scale topology.
- Frontend changes except fixture/import adjustments strictly required to
  prove unchanged backend contracts.
- Relocating or consolidating the current test projects only to resemble the
  reference tree.
- Deleting ignored `bin`/`obj` artifacts or other unrelated cleanup.

## Target Structure

The target is conceptual; folders are created only when at least one current
type belongs there.

```text
src/backend/
  FluentA.API/
    BackgroundJobs/
    Common/
    Configuration/
    Contracts/
    Controllers/
    Extensions/
    HealthChecks/
    Hubs/
    Middleware/
    Program.cs
    appsettings.json
    appsettings.Development.json

  FluentA.Application/
    BackgroundJobs/
    Common/
      Interfaces/
      Results/
    BoundedContexts/
      <Feature>/
        DTOs/
        ports, facade, errors, validators, mappers, collaborators as needed

  FluentA.Domain/
    SeedWork/
    BoundedContexts/
      <Feature>/
        Entities/
        Enums/
        Services/
        ValueObjects/ and Events/ only when present

  FluentA.Infrastructure/
    BackgroundJobs/
    RuntimeState/
    ContentProcessing/
    Email/
    ExternalServices/
    Identity/
    ObjectStorage/
    Persistence/
      AppDbContext.cs
      AppDbContextFactory.cs
      Configurations/
      Migrations/
      Repositories/<Feature>/
      Transactions/
    DependencyInjection.cs

  FluentA.API.UnitTests/
  FluentA.Application.UnitTests/
  FluentA.Domain.UnitTests/
  FluentA.Infrastructure.UnitTests/
  FluentA.slnx
```

Small features remain flat. A subfolder is introduced only when it contains a
cohesive responsibility with more than one file or materially improves
navigation. Folder count is not an acceptance target.

## Approach

### Work Package 1: Baseline And Boundary Lock

1. Record the clean/dirty worktree baseline and preserve unrelated user work.
2. Inventory all active source files and solution projects; ignore `bin` and
   `obj` artifacts.
3. Record current project references, API route/OpenAPI surface, middleware
   ordering, health endpoints, Hangfire recurring-job keys, SignalR hub path and
   notifier registrations, and EF model state.
4. Run focused architecture tests and the existing backend Release proof before
   file movement.
5. Stop if the baseline is failing in a way that prevents distinguishing
   pre-existing failures from reorganization regressions.

### Work Package 2: API Hosting Organization

1. Move current health types from `Health` to `HealthChecks` and update their
   namespaces and consumers.
2. Extract existing authentication, CORS, rate-limiting, health-check, OpenAPI,
   and endpoint/pipeline composition from `Program.cs` into concern-specific
   extension files.
3. Extract the existing global exception response into middleware or a focused
   pipeline extension without changing its status or envelope.
4. Preserve this runtime order unless executable evidence requires an explicit
   plan decision: forwarded headers, HTTPS redirection, CORS, request logging,
   rate limiting, authentication, authorization, endpoint mapping.
5. Keep SignalR notifier adapters and the hub in API because they implement
   application notification ports through the active HTTP host.
6. Prove health contracts, architecture boundaries, API compilation, and
   representative authenticated controller behavior.

### Work Package 3: Registration Decomposition

1. Keep `AddFluentAInfrastructure(IConfiguration)` as the single public entry
   used by API.
2. Split the internal registration implementation into focused registration
   collaborators for persistence/Hangfire, application facades, repositories,
   auth/email, assets/object storage, pronunciation providers, and runtime
   stores.
3. Do not add `Microsoft.Extensions.DependencyInjection` dependencies to
   Application in this reorganization. Application service registrations may
   be grouped separately inside Infrastructure composition, but Application
   remains dependent only on Domain.
4. Preserve every current service lifetime and conditional registration.
5. Add or update focused DI tests for lifetimes and provider selection before
   proceeding.

### Work Package 4: Infrastructure File Organization

1. Move `Ef*Repository` implementations under
   `Persistence/Repositories/<Feature>`.
2. Move `EfTrashTransaction` under `Persistence/Transactions`.
3. Keep EF configurations and migrations under their current persistence
   ownership.
4. Group current non-persistence implementations as follows:
   - password/JWT/Google token implementations under `Identity`;
   - Resend implementation under `Email`;
   - S3/MinIO-compatible asset implementation and probes under
     `ObjectStorage/Assets`;
   - Pomodoro memory state under `RuntimeState/Pomodoro` because it is
     process-local runtime state rather than a cache abstraction;
   - Journal and Note content processors under `ContentProcessing/<Feature>`;
   - Azure pronunciation implementation under
     `ExternalServices/Pronunciation`;
   - scheduled implementations under `BackgroundJobs`.
5. Update namespaces consistently with new ownership unless retaining a public
   namespace avoids unnecessary contract churn; record any exception here.
6. Prove repository/provider tests, API composition, and EF model stability.

### Work Package 5: Application And Domain Normalization

1. Keep each existing bounded context and public service facade stable.
2. Move common result types beneath `Common/Results` physically, retaining the
   existing namespace unless a namespace change has concrete navigation value.
3. Keep feature-specific ports beside their feature instead of collecting all
   interfaces into a global `Common/Interfaces` bucket.
4. Keep DTOs, validators, mappers, errors, trash participants, and internal
   collaborators inside their owning bounded context.
5. Keep Domain grouped by bounded context; create `ValueObjects` or `Events`
   folders only when real types exist.
6. Do not introduce new behavioral abstractions during file organization.
7. Prove focused Domain and Application tests after each bounded-context group.

### Work Package 6: Documentation And Release Proof

1. Update `src/backend/README.md` to describe the final source-accurate tree and
   how a contributor adds an endpoint, application behavior, port, adapter, and
   test.
2. Update other current-state documentation and command paths affected by file
   moves; preserve historical documents as history.
3. Run the complete validation ladder sequentially to avoid competing .NET
   writes to shared `obj/Release` outputs.
4. Record final evidence, limitations, and any explicitly deferred cleanup.
5. Move this plan to `docs/plans/completed/` only after all required proof
   passes and the result section is complete.

## Risks And Recovery

- **Namespace/import churn:** broad moves can create noisy compile failures.
  Move one coherent folder group at a time and build the affected project after
  each group.
- **Middleware ordering regression:** extracting `Program.cs` can silently
  change auth, CORS, rate-limit, or exception behavior. Preserve order and run
  focused API contract tests after the API work package.
- **DI lifetime regression:** splitting registrations can change singleton,
  scoped, transient, hosted-service, or typed-client behavior. Inventory and
  test exact lifetimes before and after extraction.
- **Provider configuration regression:** object storage, Resend, Google auth,
  Azure pronunciation, PostgreSQL, and Hangfire depend on environment-specific
  configuration. Preserve current option parsing and validate with fakes or
  existing configuration tests; do not claim live-provider proof without
  credentials and runtime evidence.
- **EF discovery/migration regression:** namespace moves can affect design-time
  discovery. Run API build, EF design-time checks, and
  `migrations has-pending-model-changes` after Infrastructure movement.
- **False architectural improvement:** folder movement alone does not improve
  behavior or boundaries. Acceptance depends on discoverability, maintained
  dependency direction, smaller composition hotspots, and executable proof.
- **Unrelated user changes:** inspect `git status` before each work package and
  avoid moving or rewriting overlapping user-owned files without reconciling
  them first.
- **Recovery:** each work package must be a coherent reversible group. Restore
  the last known-good file placement and namespaces for only the failing group;
  do not use destructive repository reset commands. Preserve already validated
  earlier groups unless evidence shows they caused the regression.

## Progress

- [x] Inspect current backend projects, responsibilities, project references,
  DI composition, source inventory, and architecture tests.
- [x] Draft the target structure using only current capabilities.
- [x] Approve this plan for implementation.
- [x] Complete Work Package 1: baseline and boundary lock.
- [x] Complete Work Package 2: API hosting organization.
- [x] Complete Work Package 3: registration decomposition.
- [x] Complete Work Package 4: Infrastructure file organization.
- [x] Complete Work Package 5: Application and Domain normalization.
- [x] Complete Work Package 6: documentation and release proof.
- [x] Record the final result and move this plan to `docs/plans/completed/`.

## Decisions

- 2026-08-17: Adapt the reference tree instead of copying it literally. Folder
  names are created only for capabilities that exist in FluentA.
- 2026-08-17: Preserve the four production projects and four current test
  projects; no Worker or Contracts project is introduced.
- 2026-08-17: Preserve `BoundedContexts` in Application and Domain rather than
  renaming it to `Features`.
- 2026-08-17: Preserve repository/provider ports instead of introducing
  `IApplicationDbContext`.
- 2026-08-17: Preserve result-based Application errors and API-owned HTTP
  envelopes; do not introduce MediatR behaviors or a generic exception family.
- 2026-08-17: Keep Application dependent only on Domain. Registration is split
  internally beneath the existing Infrastructure composition entry point so
  this reorganization adds no Application DI package.
- 2026-08-17: Preserve in-process Hangfire and SignalR composition. Runtime
  scale-out is a separate architecture decision.
- 2026-08-17: Keep Pomodoro's in-memory current-state adapter under a precise
  `RuntimeState/Pomodoro` grouping; it is process-local runtime state, not a
  cache abstraction.
- 2026-08-17: Treat folder and namespace movement as structural work only; it
  grants no authority to change product behavior or externally observable
  contracts.

## Validation

Focused proof:

- `dotnet test src/backend/FluentA.API.UnitTests/FluentA.API.UnitTests.csproj --configuration Release`
- Affected Application, Domain, and Infrastructure unit-test projects after
  each coherent move.
- Architecture tests assert the approved production project reference direction
  and that product controllers do not directly use `AppDbContext`.
- DI tests assert current service lifetimes and provider selection.
- Health tests assert `/health/live` and `/health/ready` response contracts.

Integration or end-to-end proof:

- Existing MinIO/S3-compatible storage integration proof where environment
  prerequisites are available.
- Authenticated API smoke across at least Auth and one representative CRUD
  bounded context, with unchanged route, status, and envelope.
- SignalR hub path and notifier registrations remain resolvable.
- Hangfire recurring-job registration keys and schedules remain unchanged.

Repository-required checks:

```powershell
dotnet build src/backend/FluentA.slnx --configuration Release --no-restore
dotnet test src/backend/FluentA.slnx --configuration Release --no-restore
dotnet tool run dotnet-ef migrations has-pending-model-changes `
  --project src/backend/FluentA.Infrastructure `
  --startup-project src/backend/FluentA.API `
  --configuration Release
git diff --check
```

Run the .NET build, tests, and EF command sequentially rather than concurrently
because they share Release output paths.

## Result

Completed on 2026-08-17. API composition is split into concern-owned
extensions, health checks live under `HealthChecks`, Infrastructure adapters are
grouped under persistence or capability-owned folders, registration is split by
capability, and Application result types are grouped under `Common/Results`.
The four production projects, four test projects, public contracts, shared
`AppDbContext`, Hangfire, SignalR, and runtime behavior remain intact.

Validation evidence:

- Release solution build: passed with 0 warnings and 0 errors.
- Release solution tests: 261 passed, 0 failed, 1 MinIO integration test
  skipped because the external MinIO prerequisite was not available.
- Architecture boundary tests: passed as part of the API test suite.
- EF model drift: `No changes have been made to the model since the last
  migration.`
- Stale Infrastructure namespace scan: no old namespaces remain in backend C#
  sources.
- `git diff --check`: passed; Git emitted only normal LF/CRLF normalization
  warnings for existing Windows-working-copy files.

Known limitation: live MinIO/provider smoke was not re-run because this
reorganization does not change provider behavior and the local integration
prerequisite was unavailable.
