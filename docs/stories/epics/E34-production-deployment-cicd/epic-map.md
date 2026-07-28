# E34 Production Deployment and CI/CD Epic Map

| Order | Story | Observable exit state | Depends on |
| --- | --- | --- | --- |
| 1 | `US-DEPLOY-001` Production runtime hardening and release contract | API is configurable for the final HTTPS origins, keeps signing identity across restart, emits secure cookies, and exposes deterministic live/ready health | Approved E34 context |
| 2 | `US-DEPLOY-002` Reproducible backend image and single-host production topology | One versioned release starts API, PostgreSQL, Redis, private MinIO, Caddy, and a one-shot migrator locally without public internal ports | `US-DEPLOY-001` |
| 3 | `US-DEPLOY-003` EC2 bootstrap, DNS, TLS, and recovery foundation | The manually invoked release script serves real HTTPS API/assets on EC2 and a backup restore drill succeeds | `US-DEPLOY-002` |
| 4 | `US-DEPLOY-004` GitHub PR CI and backend main-branch CD | A `dev` push runs nothing; only a `dev -> main` PR runs required CI; a `main` merge deploys the exact GHCR SHA through OIDC/SSM with concurrency, health, and rollback evidence | `US-DEPLOY-003` |
| 5 | `US-DEPLOY-005` Vercel main-only frontend production | Only `main` builds on Vercel; the custom frontend domain loads direct routes and uses the production API/auth flow | `US-DEPLOY-001`, production DNS |
| 6 | `US-DEPLOY-006` Production release and disaster-recovery proof | A controlled `dev -> main` release updates frontend/backend; restart, rollback, backup, restore, auth, SignalR, MinIO, jobs, logs, and documentation are reconciled | `US-DEPLOY-004`, `US-DEPLOY-005` |

## Release Gate

Production is not ready when only local unit tests or Docker builds pass.
`US-DEPLOY-006` must contain real Vercel-domain, EC2-domain, HTTPS, migration,
backup/restore, and post-release evidence before this epic can close.
