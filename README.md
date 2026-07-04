# FluentA

FluentA is a personal learning and productivity web application. It combines
vocabulary study and spaced-repetition flashcards with todos, habits,
countdowns, journaling, Kanban boards, Pomodoro sessions, and an in-app
notification inbox.

The repository contains a React single-page application and an ASP.NET Core
modular monolith. PostgreSQL is the durable system of record, Redis stores
short-lived session and timer state, SignalR synchronizes active browser
sessions, and Hangfire runs recurring productivity jobs.

## Features

- Email/password authentication, email verification, refresh-token rotation,
  logout revocation, and Google OAuth.
- Vocabulary boards, pages, configurable columns, cell-level autosave, and
  multilingual labels.
- Automatically synchronized flashcard decks, SM-2 review scheduling, review
  sessions, and learning dashboards.
- Daily and weekly todos, scheduled habits and statistics, countdown events,
  and dashboard widgets.
- Rich-text journal entries with autosave, multilingual search, and a learning
  date calendar.
- Kanban boards with card movement and cross-tab synchronization.
- Server-authoritative Pomodoro timers, task linking, session history, and
  stopwatch behavior.
- Durable notifications produced by scheduled jobs for habit reminders and
  completed countdowns.

## Technology

| Area | Stack |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, React Router |
| Client data | TanStack Query, Zustand, Axios |
| Backend | ASP.NET Core on .NET 10 |
| Persistence | PostgreSQL 16, Entity Framework Core |
| Ephemeral state | Redis 7 |
| Realtime | SignalR |
| Background work | Hangfire with PostgreSQL storage |
| Testing | xUnit, Vitest, Playwright |

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for component boundaries,
data ownership, and runtime flows.

## Repository Layout

```text
src/
  backend/
    FluentA.API/                 HTTP and SignalR interface
    FluentA.Application/         Use cases and ports
    FluentA.Domain/              Entities and business rules
    FluentA.Infrastructure/      PostgreSQL, Redis, providers, jobs
    FluentA.*.UnitTests/         Backend unit tests
  frontend/
    src/routes/                  Route-level feature UI
    src/components/              Shared and feature components
    src/lib/api/                 REST clients
    src/lib/auth/                Authentication boundary
    src/lib/realtime/            SignalR synchronization
    e2e/                         Playwright scenarios
docs/
  product/                       Living product contracts
  stories/                       Story scope and validation evidence
  decisions/                     Architecture decision records
scripts/                         Harness CLI and verification scripts
```

## Local Development

### Prerequisites

- .NET 10 SDK
- Node.js and npm
- Docker with Docker Compose

### Start dependencies

From the repository root:

```powershell
docker compose -f docker-compose.dev.yml up -d
```

This starts PostgreSQL on `localhost:5432` and Redis on `localhost:6379`.
It also starts MinIO on `127.0.0.1:9000` with the console at
`http://127.0.0.1:9001` and bootstraps the development bucket
`fluenta-assets-dev`.

### Apply database migrations

```powershell
dotnet tool restore
dotnet tool run dotnet-ef database update `
  --project src/backend/FluentA.Infrastructure `
  --startup-project src/backend/FluentA.API
```

### Start the API

```powershell
dotnet run --project src/backend/FluentA.API --launch-profile http
```

The API listens at `http://localhost:5000`; REST endpoints use the
`/api/v1` prefix and the authenticated SignalR hub is `/hubs/sync`.

Tracked development config also enables the local MinIO asset runtime through
the `AssetStorage` section in `src/backend/FluentA.API/appsettings.Development.json`.
Those credentials are development-only and must not be reused outside local
Docker.

### Start the frontend

```powershell
Copy-Item src/frontend/.env.example src/frontend/.env.local
npm --prefix src/frontend install
npm --prefix src/frontend run dev
```

Open `http://127.0.0.1:5173`.

Use `127.0.0.1` consistently for browser testing instead of mixing it with
`localhost`. The auth flow uses an HttpOnly refresh cookie plus
`withCredentials`, so keeping the same host across frontend URLs, callback
URLs, and email links makes local behavior match production more closely.

### Production-like local auth setup

The tracked development config keeps `Authentication:Email:Provider=local` so
the repo runs without mail credentials. For a production-like login and email
verification flow, keep the frontend on `http://127.0.0.1:5173` and supply
real mail secrets through .NET user-secrets:

```powershell
dotnet user-secrets --project src/backend/FluentA.API init
dotnet user-secrets --project src/backend/FluentA.API set "Authentication:ChallengeKey" "<long-random-secret>"
dotnet user-secrets --project src/backend/FluentA.API set "Authentication:Email:Provider" "gmail-smtp"
dotnet user-secrets --project src/backend/FluentA.API set "Authentication:Email:FromAddress" "<your-gmail@gmail.com>"
dotnet user-secrets --project src/backend/FluentA.API set "Authentication:Email:FromName" "FluentA"
dotnet user-secrets --project src/backend/FluentA.API set "Authentication:Email:BaseUrl" "http://127.0.0.1:5173"
dotnet user-secrets --project src/backend/FluentA.API set "Authentication:Email:Smtp:Host" "smtp.gmail.com"
dotnet user-secrets --project src/backend/FluentA.API set "Authentication:Email:Smtp:Port" "587"
dotnet user-secrets --project src/backend/FluentA.API set "Authentication:Email:Smtp:Username" "<your-gmail@gmail.com>"
dotnet user-secrets --project src/backend/FluentA.API set "Authentication:Email:Smtp:Password" "<gmail-app-password>"
dotnet user-secrets --project src/backend/FluentA.API set "Authentication:Email:Smtp:EnableSsl" "true"
```

Use a Gmail App Password, not the normal account password. The Gmail account
must have 2-step verification enabled before App Passwords are available.
`Authentication:ChallengeKey` must also stay outside tracked files; otherwise
OTP and reset challenges become invalid after an API restart.

Google login requires `VITE_GOOGLE_CLIENT_ID` in the frontend and matching
server-side Google OAuth configuration. Keep provider secrets outside tracked
files by using .NET user-secrets or environment variables.

## Validation

Run the backend suite:

```powershell
dotnet test src/backend/FluentA.slnx
```

Run frontend static checks and unit tests:

```powershell
npm --prefix src/frontend run lint
npm --prefix src/frontend run test:run
npm --prefix src/frontend run build
```

With the local API, frontend, PostgreSQL, and Redis running, execute browser
tests with:

```powershell
npm --prefix src/frontend run test:e2e
```

Additional cross-browser and performance suites are available as
`test:e2e:cross-browser` and `test:e2e:performance`. The current story-level
proof matrix is queried with:

```powershell
.\scripts\bin\harness-cli.exe query matrix
```

## Engineering Workflow

This repository uses Harness to preserve product intent, risk classification,
validation evidence, and architecture decisions across agent-assisted work.
Before making changes, read `AGENTS.md`, `docs/HARNESS.md`,
`docs/FEATURE_INTAKE.md`, `docs/ARCHITECTURE.md`, and
`docs/CONTEXT_RULES.md`, then query the Harness matrix.

Product behavior belongs in `docs/product/`, scoped work and evidence in
`docs/stories/`, and durable architecture choices in `docs/decisions/`.
