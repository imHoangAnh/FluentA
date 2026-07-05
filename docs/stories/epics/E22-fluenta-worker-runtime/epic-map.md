# E22 FluentA Worker Runtime

Mode: `high_risk_feature`

## Feature Outcome

`FluentA.Worker` is a separate .NET process that owns Hangfire server execution,
recurring schedule registration, and Worker health endpoints. `FluentA.API`
continues to own REST and SignalR only, and starts independently when the Worker
is offline.

## Architecture Basis

- `history/fluent-worker-runtime/CONTEXT.md` locked the split-runtime decisions.
- `SPEC.md` section 19 defines the recurring jobs, local ports, and proof
  ladder.
- Current job behavior stays in Application/Infrastructure; Worker is only a
  composition root.

## Story Queue

| Story | Outcome | Status |
| --- | --- | --- |
| `US-WORKER-001` | Worker runtime split, schedule registration, health checks, local Compose support, docs, and release proof. | Current release slice |

## Proof Needed

- Worker and API builds pass.
- Backend solution tests pass.
- Docker Compose config includes the Worker profile and health port.
- Live Worker smoke proves `/health/live`, `/health/ready`, and recurring job
  registration for all stable IDs.
- Live API smoke proves API starts without Worker and does not expose the
  Hangfire dashboard.
