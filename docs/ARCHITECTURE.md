# Architecture

FluentA is a browser-based personal learning and productivity system built as
a modular monolith. A React SPA communicates with one ASP.NET Core API through
versioned REST endpoints and an authenticated SignalR hub. PostgreSQL is the
durable system of record; Redis holds revocable sessions and transient timer
state; Hangfire runs recurring work from the API process.

## System Context

```text
Browser (React SPA)
  |-- HTTPS / JSON / JWT ----------> ASP.NET Core API
  |<--------- JSON responses -------|
  |<====== authenticated SignalR ===|
                                      |-- EF Core ------> PostgreSQL
                                      |-- Redis client -> Redis
                                      |-- HTTPS --------> Google OAuth
                                      |-- HTTPS --------> AWS SES (optional)
                                      `-- Hangfire -----> PostgreSQL storage
```

The current deployment unit is one API application plus one static frontend.
PostgreSQL and Redis are external runtime dependencies. There is no message
broker, SignalR backplane, or independently deployed domain service.

## Backend Layers

The backend follows a Clean Architecture dependency direction:

```text
FluentA.Domain
      ^
      |
FluentA.Application <---- FluentA.Infrastructure
      ^                         ^
      |                         |
      +--------- FluentA.API ---+
```

### Domain

`FluentA.Domain` owns entities, value-level validation, state transitions, and
business invariants. It does not depend on ASP.NET Core, Entity Framework,
Redis, or provider SDKs.

The implemented bounded contexts are:

- Auth
- Vocabulary
- Flashcards and reviews
- Todo
- Habit
- Countdown
- Journal
- Kanban
- Pomodoro
- Notification

### Application

`FluentA.Application` implements use cases and defines ports for repositories,
provider services, transient stores, and realtime notifications. Application
services coordinate ownership checks, domain behavior, transactions, and DTO
mapping without depending on concrete infrastructure clients.

Writes that affect multiple product concepts remain inside one application
transaction where required. For example, vocabulary changes synchronize their
derived flashcards before the commit completes.

### Infrastructure

`FluentA.Infrastructure` implements application ports:

- EF Core repositories and migrations over PostgreSQL.
- Redis refresh-session and Pomodoro current-state stores.
- BCrypt password hashing and JWT token creation.
- Google authorization-code exchange.
- Local-log and AWS SES email verification senders.
- Hangfire storage, workers, and scheduled productivity jobs.

All bounded contexts currently share one `AppDbContext`. Module ownership is
therefore enforced by code structure, repository interfaces, review, and tests
rather than by separate schemas or databases.

### API

`FluentA.API` is the composition root and external interface. It configures:

- Controllers under `/api/v1`.
- JWT bearer authentication and authorization.
- The authorized SignalR hub at `/hubs/sync`.
- CORS for the local frontend.
- Canonical request logging and error envelopes.
- Infrastructure dependency injection and recurring Hangfire registration.

Controllers parse transport input, obtain the authenticated user identity, and
delegate use cases to application services. Business rules do not belong in
controllers.

## Frontend Architecture

`src/frontend` is a React SPA organized around product routes. Route components
compose feature UI and TanStack Query operations; API modules own HTTP request
shapes; authentication and realtime behavior live under `src/lib`.

Responsibilities are divided as follows:

| Concern | Owner |
| --- | --- |
| Routing and protected pages | React Router and `ProtectedRoute` |
| Server-state cache | TanStack Query |
| Authentication state | Zustand auth store |
| HTTP transport | Axios API clients |
| Cross-tab/server synchronization | SignalR hooks and query invalidation |
| Rich-text editing | TipTap |
| Drag and drop | dnd-kit |

PostgreSQL-backed API responses are the source of truth. TanStack Query caches
responses, while SignalR events invalidate or refetch affected query keys.
Clients must not treat event delivery as durable state.

## Runtime Flows

### Authenticated request

```text
React route
  -> API client adds access token
  -> controller parses request and user claim
  -> application service checks ownership and invariants
  -> repository executes through AppDbContext
  -> PostgreSQL transaction commits
  -> controller returns the standard API envelope
```

Access tokens are short-lived JWTs. Refresh tokens are opaque cookies whose
hashed session records live in Redis with expiration and explicit revocation.
Refresh rotation revokes the previous session; logout revokes the current one.

### Realtime synchronization

```text
successful durable commit
  -> application notifier port
  -> SignalR notifier adapter
  -> authenticated user group
  -> browser event handler
  -> TanStack Query invalidation/refetch
```

JWT query-string extraction is accepted only for `/hubs/sync`, which is needed
for WebSocket negotiation. Events are user-scoped and emitted after durable
commit. Current realtime domains include flashcards, todos, habits, Kanban, and
Pomodoro.

The present SignalR setup is single-instance. Multiple API instances require a
shared backplane or a managed SignalR service before realtime delivery can be
considered reliable across instances.

### Background jobs and notifications

Hangfire uses the application PostgreSQL server for durable schedules and job
state. Stable recurring jobs are registered at API startup and execute inside
the API process. The public Hangfire dashboard is intentionally disabled.

Scheduled jobs currently:

- Carry overdue incomplete todos into the current day.
- Create due habit reminder notifications.
- Create notifications for completed countdowns.
- Permanently remove selected records soft-deleted for more than 30 days.

Notification records are owner-scoped and use per-user deduplication keys.
Audit/product records and operational application logs remain separate
concerns.

## Data Ownership

PostgreSQL stores durable user and product data, including users, vocabulary,
flashcards, review history and settings, productivity entities, journal data,
Kanban data, Pomodoro configuration and history, notifications, and Hangfire
state.

Redis stores only state with an expiration or revocation lifecycle:

- Hashed refresh-token sessions.
- Current per-user Pomodoro snapshots with a two-day TTL.

Redis is not the source of truth for durable product history. Pomodoro session
history and configuration remain in PostgreSQL.

Most user-owned product records support soft deletion. The cleanup job is the
explicit boundary that converts eligible soft deletions into permanent
deletions after the retention period.

## Boundary Rules

### Dependency rule

| Layer | May depend on | Must not depend on |
| --- | --- | --- |
| Domain | Pure domain code | Frameworks, database clients, UI, environment |
| Application | Domain | Controllers, concrete EF/Redis/provider clients |
| Infrastructure | Domain, Application | Frontend or controller behavior |
| API | Application, Infrastructure | Domain persistence internals |
| Frontend | Public API and event contracts | Backend domain or EF internals |

### Parse-first rule

Unknown input must be parsed at the owning boundary before it reaches inner
code. This includes HTTP bodies and query strings, identity claims,
environment variables, database/provider payloads, SignalR messages, and
OAuth responses.

```text
unknown input
  -> boundary parser and validation
  -> typed request or command
  -> application use case
  -> domain entity/value
```

Fields backed by constrained database columns must validate the same range,
precision, and scale before persistence.

### Ownership rule

Every user-owned query and command must scope data access by the authenticated
user. Foreign-owned and deleted resources are exposed as not found where the
product contract requires non-disclosure. Realtime events and notifications
must use the same ownership boundary.

### Concurrency and transaction rule

- Database unique constraints are the final guard for uniqueness invariants.
- Lazy per-user default creation must handle a concurrent insert loser by
  reading the winning row.
- Cell-scoped updates must remain cell-scoped through request, persistence,
  and frontend cache updates.
- Cross-domain derived writes must commit atomically before realtime events are
  published.
- Scheduled jobs must use durable markers or deduplication keys when retries
  could otherwise duplicate visible effects.

## Observability

The API emits one structured request log per request with request identity,
authenticated user when available, action, duration, status, and message.
Background jobs emit structured operational summaries. Product notifications
and future audit records must not be replaced by application logs.

OpenAPI is exposed in the Development environment. Health endpoints and a
production metrics/tracing backend are not currently part of the runtime.

## Validation Architecture

Validation is layered by risk:

- Domain and application unit tests verify rules and orchestration.
- Live PostgreSQL/Redis integration proof verifies migrations, constraints,
  concurrency behavior, and transient-state semantics.
- Vitest verifies frontend component and route contracts.
- Playwright verifies authenticated user flows, realtime synchronization,
  cross-browser behavior, and performance scenarios.
- `scripts/bin/harness-cli query matrix` records story-level proof status.

Architecture or behavior changes must update the relevant product contract,
story evidence, matrix row, and decision record as required by the Harness
workflow.

## Scaling Boundaries

The modular monolith is the intended current architecture. Domain services
should not be extracted solely to mirror bounded-context folders.

The first scaling steps are operational:

1. Run multiple stateless API instances behind a load balancer.
2. Add a Redis SignalR backplane or managed SignalR service.
3. Move Hangfire workers into a separately deployed process while retaining
   shared application contracts.
4. Add production health checks, metrics, distributed tracing, and secret
   management.
5. Scale PostgreSQL with indexes, connection tuning, and read/query analysis
   before considering database decomposition.

A bounded context should become an independent service only when it needs an
independent deployment cadence, scaling profile, failure boundary, or data
ownership model that outweighs distributed-system cost.
