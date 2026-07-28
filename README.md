# FluentA

> A full-stack learning and productivity platform that combines vocabulary
> study, spaced repetition, and personal workflow management.

<p align="center">
  <img src="src/frontend/src/assets/hero.png" alt="FluentA layered learning illustration" width="220" />
</p>

[Overview](#overview) · [Features](#key-features) · [Architecture](#architecture) ·
[Getting Started](#getting-started) · [Documentation](#documentation)

## Overview

FluentA helps learners build vocabulary, practise with flashcards, and review
at the right time while managing the tasks and habits that support consistent
learning. It brings learning tools, personal planning, focus sessions, notes,
and progress tracking into one web application.

The repository contains a React single-page application and an ASP.NET Core
modular monolith. PostgreSQL is the durable store, Redis manages short-lived
state, SignalR synchronizes active sessions, MinIO stores assets, and Hangfire
runs recurring jobs.

## Key Features

- Configurable vocabulary boards with multilingual columns and cell autosave.
- Synchronized flashcards, practice modes, review sessions, and spaced
  repetition scheduling.
- Daily and weekly todos, habit tracking, countdowns, Kanban, and Pomodoro.
- Rich-text journal entries, notes, notifications, and profile settings.
- Email/password authentication, account recovery, and Google OAuth.
- Realtime updates across authenticated browser sessions.

## Architecture

```mermaid
flowchart LR
    UI["React SPA"] -->|"REST /api/v1"| API["ASP.NET Core API"]
    UI <-->|"SignalR /hubs/sync"| API
    API --> APP["Application and Domain"]
    APP --> INFRA["Infrastructure"]
    INFRA --> PG[("PostgreSQL")]
    INFRA --> REDIS[("Redis")]
    INFRA --> MINIO[("MinIO")]
    API --> JOBS["Hangfire jobs"]
```

The backend keeps HTTP and realtime concerns in `FluentA.API`, use cases in
`FluentA.Application`, business rules in `FluentA.Domain`, and external service
implementations in `FluentA.Infrastructure`. See
[Architecture](docs/ARCHITECTURE.md) for boundaries, ownership, and runtime
flows.

## Tech Stack

| Area | Technologies |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, React Router |
| Client state and data | TanStack Query, Zustand, Axios |
| Backend | ASP.NET Core, .NET 10, Entity Framework Core |
| Data and infrastructure | PostgreSQL 16, Redis 7, MinIO, Docker Compose |
| Realtime and jobs | SignalR, Hangfire |
| Testing | xUnit, Vitest, Playwright |

## Engineering Highlights

- Modular-monolith boundaries separate domain rules from delivery and
  infrastructure concerns.
- A consistent `ApiEnvelope<T>` contract keeps frontend and backend error
  handling predictable.
- SignalR events and query invalidation synchronize changes across active
  sessions.
- Server-authoritative scheduling drives spaced repetition, reminders, and
  productivity jobs.
- Unit and browser-level test suites cover business rules and critical user
  workflows.

## Getting Started

### Prerequisites

- .NET 10 SDK
- Node.js and npm
- Docker with Docker Compose

### 1. Install dependencies

Run from the repository root:

```powershell
dotnet restore src/backend/FluentA.slnx
npm --prefix src/frontend install
Copy-Item src/frontend/.env.example src/frontend/.env.local
```

### 2. Start local infrastructure

```powershell
docker compose -f docker-compose.dev.yml up -d
```

This starts PostgreSQL, Redis, MinIO, and the local MinIO bucket bootstrap.
The FluentA development database is `fluenta_dev`, exposed on
`localhost:5432`, and persisted in the Docker volume
`fluenta-postgres-dev-data`.

### 3. Apply database migrations

```powershell
dotnet tool restore
dotnet tool run dotnet-ef database update `
  --project src/backend/FluentA.Infrastructure `
  --startup-project src/backend/FluentA.API
```

### 4. Start the API

```powershell
dotnet run --project src/backend/FluentA.API --launch-profile http
```

The API is available at `http://localhost:5000`; its development OpenAPI
document is at `http://localhost:5000/openapi/v1.json`.

### 5. Start the frontend

Open another terminal at the repository root:

```powershell
npm --prefix src/frontend run dev
```

Open `http://localhost:5173`.

## Usage

1. Register a new account or sign in.
2. Create a vocabulary board and add the columns needed for the target
   language.
3. Add words and use the synchronized flashcards for practice or scheduled
   review.
4. Plan learning with todos, habits, Kanban, countdowns, and Pomodoro sessions.
5. Capture longer-form content in Journal or Notes and review reminders in the
   notification inbox.

## Testing

```powershell
# Backend unit tests
dotnet test src/backend/FluentA.slnx

# Frontend checks
npm --prefix src/frontend run lint
npm --prefix src/frontend run test:run
npm --prefix src/frontend run build

# Browser tests require the local stack to be running
npm --prefix src/frontend run test:e2e
```

## Project Structure

```text
src/
  backend/
    FluentA.API/                 HTTP, authentication, and SignalR
    FluentA.Application/         Use cases and application ports
    FluentA.Domain/              Entities and business rules
    FluentA.Infrastructure/      Persistence and external providers
  frontend/
    src/app/                     Application shell and router
    src/features/                Feature-owned UI and data access
    src/shared/                  Shared components, types, and utilities
    e2e/                         Playwright scenarios
docs/
  product/                       Current product contracts
  stories/                       Story scope and validation evidence
  decisions/                     Architecture decision records
```

## Documentation

- [Frontend development guide](src/frontend/README.md)
- [Backend and API guide](src/backend/README.md)
- [System architecture](docs/ARCHITECTURE.md)
