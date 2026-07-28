# E34 Production Deployment and CI/CD Context

## Approved Direction

FluentA will use one production environment and no hosted development or
staging environment.

- `dev` is the owner's local integration branch. A push to `dev` triggers
  neither GitHub Actions nor a Vercel build and never deploys.
- `main` is the only production branch.
- Frontend production is a Vercel project rooted at `src/frontend`.
- Backend production and its supporting runtime run on one AWS EC2 instance.
- PostgreSQL, Redis, MinIO, the ASP.NET Core API, API-hosted Hangfire workers,
  and Caddy run through Docker Compose on that EC2 instance.
- The purchased custom domain is split between Vercel and EC2:
  - apex and/or `www` serve the Vercel frontend;
  - `api.<domain>` serves the API through Caddy;
  - `assets.<domain>` serves the private MinIO API through Caddy for presigned
    browser uploads and downloads.
- The production data plane does not use RDS, ElastiCache, S3, ECR, ECS, EKS,
  an ALB, or a hosted staging stack.
- GitHub Container Registry stores immutable backend images.
- GitHub Actions uses short-lived AWS credentials through GitHub OIDC and
  invokes an EC2 deploy through Systems Manager Run Command. IAM, the EC2
  instance profile, Security Groups, EBS, Elastic IP, and SSM are management
  primitives rather than hosted FluentA data services.

## Release Flow

```text
local work
  -> commit and push dev (no CI and no deployment)
  -> open or update pull request dev -> main
  -> GitHub Actions CI for that pull request
  -> required CI succeeds
  -> merge main
     -> Vercel Git integration deploys frontend production
     -> GitHub Actions publishes an immutable backend image to GHCR
     -> GitHub Actions assumes the production AWS role through OIDC
     -> SSM invokes the versioned EC2 deploy script
     -> backup gate
     -> one-shot database migration
     -> Docker Compose update
     -> public health and smoke checks
```

Vercel preview builds are intentionally disabled. Vercel's Ignored Build Step
must be set to `Only build production` so pushes to `dev` consume neither a
preview deployment nor preview build capacity.

## Current Repository Evidence

- `docker-compose.dev.yml` is development-only. It exposes PostgreSQL, Redis,
  MinIO API, and MinIO console ports and contains local credentials.
- No production Dockerfile, production Compose file, Caddy configuration,
  deployment script, runbook, or GitHub Actions workflow exists.
- `src/backend/FluentA.API/Program.cs` hard-codes localhost CORS origins and
  does not expose production health endpoints.
- `src/backend/FluentA.Infrastructure/Auth/JwtSigningKeyProvider.cs` creates a
  new RSA key at each API startup.
- `src/backend/FluentA.API/Controllers/AuthController.cs` creates the refresh
  cookie with `Secure = false`.
- MinIO presigned URLs use the configured `AssetStorage:Endpoint`; production
  therefore needs a browser-reachable HTTPS asset hostname.
- Hangfire is hosted by `FluentA.API`; the remaining
  `FluentA.Worker/Properties/launchSettings.json` is not a deployable worker.
- Frontend production reads `VITE_API_URL` and
  `VITE_GOOGLE_REDIRECT_URI` at build time.

## Required Inputs Before Implementation

The following values must be supplied without placing secret values in tracked
files:

1. Production domain and preferred apex/`www` canonical host.
2. DNS provider.
3. AWS region and EC2 instance id after provisioning.
4. EC2 architecture and capacity. The initial planning target is at least
   2 vCPU, 8 GiB memory, and 50-100 GiB encrypted EBS, subject to a measured
   local production-topology smoke.
5. Whether the GHCR backend package may be public. A private package requires a
   read-only package credential on EC2.
6. Production email, Google OAuth, and Azure Speech provider choices.
7. Backup destination and retention. A backup stored only on the same EC2/EBS
   failure boundary is not accepted as recoverable production backup.
8. Maximum acceptable downtime for the first deployment and later migrations.

## Non-Goals

- Hosted `dev`, preview, staging, or QA environments.
- Multi-instance API or PostgreSQL high availability.
- Blue/green infrastructure.
- Kubernetes, ECS, or a managed database/cache/object store.
- Automatic rollback of a destructive or backward-incompatible database
  migration.
- Deploying the frontend to EC2.
