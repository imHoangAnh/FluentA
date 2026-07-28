# US-DEPLOY-001 Production Runtime Hardening

## Current Behavior

- CORS permits only local Vite origins.
- The refresh cookie is not marked Secure.
- JWT signing identity changes each time the API process starts.
- The API has no live or ready health contract.
- Production public URLs and proxy boundaries are not documented as runtime
  configuration.

## Target Behavior

The same API artifact runs locally and in production from explicit
environment-specific configuration. Production startup fails closed when
required configuration is missing. Restarting the API preserves JWT signing
identity, auth cookies are safe for HTTPS, CORS permits only the production
frontend, trusted proxy headers are handled correctly, and health endpoints
distinguish process liveness from dependency readiness.

## Affected Users

- The owner deploying and recovering FluentA.
- Users retaining authenticated sessions across a production release.

## Affected Product Docs

- `docs/product/authentication.md`
- `docs/product/database-performance.md`
- new `docs/product/deployment.md`
- `docs/ARCHITECTURE.md`

## Non-Goals

- Docker/Compose implementation.
- EC2, DNS, Vercel, IAM, SSM, or GitHub configuration.
- Multi-instance SignalR.
- Business API or database schema changes.

