# E34 Production Deployment and CI/CD Approach

## Recommended Path

Use Vercel Git integration as frontend CD and GitHub Actions as the common CI
gate plus backend CD.

This avoids deploying the same frontend commit twice. GitHub Actions proves the
frontend with lint, tests, and a production build; Vercel builds and publishes
the frontend only after `main` changes. GitHub Actions builds the backend image
once, identifies it by commit SHA, publishes it to GHCR, and asks EC2 to deploy
that exact SHA.

EC2 keeps a read-only checkout or release metadata only for versioned Compose,
Caddy, and deployment scripts. Application binaries are never built on EC2.
The EC2 bootstrap script fetches the requested `main` commit, then executes the
release script from that detached commit.

## Runtime Topology

```text
Internet
  |
  +-- https://<domain> ------------> Vercel frontend
  |
  +-- https://api.<domain> --------> Caddy -> FluentA.API
  |                                             |
  |                                             +-> PostgreSQL
  |                                             +-> Redis
  |                                             +-> MinIO
  |                                             `-> Hangfire in API process
  |
  `-- https://assets.<domain> -----> Caddy -> MinIO API

Not public:
  PostgreSQL 5432
  Redis 6379
  MinIO console 9001
  API container port
```

Only EC2 ports 80 and 443 are public. Port 22 is disabled when SSM access is
proven; during bootstrap it may be restricted to the owner's current IP and
removed after SSM validation.

## Deployment Repository Shape

Expected tracked files:

```text
.github/workflows/ci.yml
.github/workflows/deploy-backend.yml
src/backend/FluentA.API/Dockerfile
src/backend/.dockerignore
deploy/compose.production.yml
deploy/Caddyfile
deploy/env.production.example
deploy/scripts/bootstrap-host.sh
deploy/scripts/deploy-release.sh
deploy/scripts/backup.sh
deploy/scripts/restore-drill.sh
docs/product/deployment.md
docs/runbooks/ec2-bootstrap.md
docs/runbooks/production-release.md
docs/runbooks/backup-restore.md
```

`env.production.example` contains names and safe examples only. The real
`/opt/fluenta/shared/.env.production` is created directly on EC2, is owned by
root/the deploy group, uses mode `0600`, and is never committed or emitted in
GitHub Actions/SSM command text.

## Local and Repository Work

### Production configuration

1. Replace hard-coded CORS origins with an explicit configuration list.
2. Make refresh-cookie security environment-aware and require
   `Secure = true` in Production.
3. Load a persistent production signing key instead of generating an RSA key
   on each API start.
4. configure forwarded headers for the trusted Caddy proxy.
5. Add:
   - `/health/live`: process is alive;
   - `/health/ready`: PostgreSQL, Redis, required MinIO policy/bucket, and other
     mandatory startup dependencies are ready.
6. Configure production values for PostgreSQL pooling, Hangfire worker count,
   Redis, MinIO, email, Google OAuth, Azure Speech, allowed hosts, CORS, and
   public frontend URLs through environment variables.
7. Ensure Development-only debug OTP/reset behavior and OpenAPI exposure are
   absent in Production.

### Containerization

1. Add a multi-stage .NET 10 API Dockerfile.
2. Run as a non-root user and expose only the internal API port.
3. Add a one-shot migration image/target or an EF migration bundle built from
   the same commit as the API image.
4. Pin production dependency image versions; do not use `latest`.
5. Add health checks and restart policies.
6. Give PostgreSQL and MinIO persistent named/bind volumes on encrypted EBS.
7. Do not publish internal service ports to the EC2 host.
8. Publish MinIO only through `assets.<domain>` and keep the console private.

### CI

`ci.yml` runs only when a pull request targeting `main` is opened, reopened, or
updated. It has no `push` trigger, so pushing to `dev` or `main` does not start
this CI workflow.

GitHub's `pull_request.branches` filter matches the base branch, not the source
branch. Therefore the workflow must include a required source-branch job that
fails unless `github.head_ref == 'dev'`. This enforces the approved
`dev -> main` path even if someone opens a PR from another branch.

Trigger and source-branch gate:

```yaml
name: PR CI

on:
  pull_request:
    branches: [main]
    types: [opened, synchronize, reopened]

permissions:
  contents: read

jobs:
  source-branch:
    runs-on: ubuntu-latest
    steps:
      - name: Require dev as the source branch
        shell: bash
        run: |
          if [ "${{ github.head_ref }}" != "dev" ]; then
            echo "Only pull requests from dev to main are allowed."
            exit 1
          fi
```

Required jobs:

```text
backend:
  dotnet restore
  dotnet test --configuration Release
  dotnet publish / build

frontend:
  npm ci
  npm run lint
  npm run test:run
  npm run build

container:
  docker build
  docker compose -f deploy/compose.production.yml config --quiet

security/config:
  scan tracked files for forbidden production secret patterns
  verify no production Compose service publishes internal ports
  verify images do not use latest
```

The source-branch, frontend, backend, container, and security/config status
names become required checks on `main`. The test jobs depend on the
source-branch job, so an unsupported source branch cannot pass the merge gate.

### Backend CD

`deploy-backend.yml` runs only on a push to `main`. There is no
`workflow_dispatch` or non-production branch trigger in this initial contract.

1. Rely on `main` branch protection to require the PR CI checks and block direct
   pushes before a merge can create the production commit.
2. Build and publish `ghcr.io/imhoanganh/fluenta-api:<full-sha>`.
3. Never deploy from the mutable `latest` tag.
4. Use the GitHub `production` environment.
5. Give the job only:
   - `contents: read`;
   - `packages: write` for the publish job;
   - `id-token: write` for the deploy job.
6. Use GitHub OIDC to assume an AWS role whose trust is restricted to this
   repository and the `production` GitHub environment/main release path.
7. Permit the role only the SSM operations and EC2 target necessary for the
   tagged production instance.
8. Invoke SSM with the commit SHA only. Never put application secrets into the
   SSM command.
9. Poll SSM command status and fail the GitHub deployment if the remote command
   fails or times out.
10. Use a concurrency group so only one production backend deployment runs at
    a time; newer releases must not interrupt a migration already in progress.

### EC2 release script

For requested SHA `R`:

1. Acquire a host deployment lock.
2. Verify `R` exists on `origin/main`.
3. Verify required environment keys without printing values.
4. Record the currently deployed SHA.
5. Create PostgreSQL and MinIO backup artifacts and copy them to the approved
   off-host backup destination.
6. Verify the backup artifacts are readable.
7. Pull the API and migration images for `R`.
8. Run the one-shot migration.
9. Stop immediately if migration fails.
10. Apply the Compose release for `R`.
11. Wait for internal readiness.
12. Verify public HTTPS API health, auth-cookie attributes, CORS, SignalR
    negotiation, and a private MinIO presigned transfer.
13. Persist the successful SHA and deployment timestamp.
14. If the application update fails after a backward-compatible migration,
    restore the previous image SHA.
15. If the migration is not backward-compatible, do not automatically roll
    back. Enter the documented recovery procedure and require human approval
    before restoring production data.

## Vercel Configuration

1. Import the GitHub repository once.
2. Set Root Directory to `src/frontend`.
3. Set Framework Preset to Vite.
4. Use install command `npm ci`, build command `npm run build`, and output
   directory `dist`.
5. Set Production Branch to `main`.
6. Set Ignored Build Step to `Only build production`; `dev` and PRs do not
   create Vercel deployments.
7. Configure only Production environment variables:
   - `VITE_API_URL=https://api.<domain>/api/v1`;
   - `VITE_GOOGLE_CLIENT_ID=<public client id>`;
   - `VITE_GOOGLE_REDIRECT_URI=https://<domain>/auth/google/callback`.
8. Add the apex and/or `www` custom domain.
9. Add an SPA rewrite only if direct React Router routes return 404 on the
   deployed Vite application.
10. Do not add `VERCEL_TOKEN` to GitHub because Vercel Git integration owns
    frontend CD.

## GitHub Configuration

### Branches

- `dev`: direct owner pushes allowed; no GitHub Actions workflow and no Vercel
  build or deployment runs for the push.
- `main`: no direct pushes; merge through pull request from `dev`.

Protect `main` with:

- required pull request;
- required source-branch, frontend, backend, container, and configuration
  checks from the PR CI workflow;
- required up-to-date branch before merge;
- blocked force pushes and deletion;
- resolved conversations;
- no administrator bypass unless emergency recovery is documented.

### Environments and variables

Create GitHub environment `production` and restrict it to `main`.

Repository/environment variables:

```text
AWS_REGION
AWS_DEPLOY_ROLE_ARN
EC2_INSTANCE_ID
GHCR_IMAGE
```

No AWS access key, database password, MinIO key, JWT private key, SMTP password,
Google client secret, or Azure subscription key is stored in the workflow.

## EC2 Bootstrap Work

1. Launch an Ubuntu LTS EC2 instance in the selected region.
2. Attach encrypted EBS sized from the approved capacity plan.
3. Allocate and associate an Elastic IP.
4. Attach an instance profile that allows SSM managed-instance operation.
5. Configure the Security Group:
   - 80/tcp from the Internet;
   - 443/tcp from the Internet;
   - 22/tcp only from the owner's IP during bootstrap, or no 22 if Session
     Manager works immediately;
   - no public PostgreSQL, Redis, MinIO, console, or API ports.
6. Patch the OS and enable automatic security updates.
7. Install Docker Engine and the Compose plugin from the supported Docker
   repository.
8. Create a non-login or restricted `fluenta-deploy` user/group.
9. Create:

```text
/opt/fluenta/releases
/opt/fluenta/shared
/opt/fluenta/backups
/opt/fluenta/bin
```

10. Install the read-only Git deploy key if the production scripts are fetched
    from the private repository.
11. Log in to private GHCR using a read-only package credential, or prove
    anonymous pull if the package is public.
12. Place the real root-readable production environment file.
13. Prove SSM command execution, then close port 22.
14. Execute the first release manually through the same deploy script that the
    main-branch CD workflow will later call.

## DNS and TLS

1. Add the Vercel-provided apex/`www` records at the current DNS provider.
2. Add `A` records for `api.<domain>` and `assets.<domain>` to the EC2 Elastic
   IP.
3. Start Caddy only after DNS resolves to the EC2 address and ports 80/443 are
   reachable.
4. Verify automatic certificate issuance and HTTP-to-HTTPS redirects.
5. Configure Google OAuth allowed origin/redirect and email links with the
   final HTTPS frontend domain.

## Alternatives Rejected

1. **Frontend on EC2.** Rejected because it duplicates Vercel CDN, TLS,
   atomic frontend deployment, and rollback work while consuming EC2
   resources.
2. **Deploy frontend through both Vercel Git integration and a GitHub Action.**
   Rejected because one commit can create duplicate deployments and requires a
   long-lived Vercel token in GitHub.
3. **Build the backend on EC2.** Rejected because production would no longer
   run the exact artifact proven by CI and deployments would consume runtime
   capacity.
4. **SSH from a GitHub-hosted runner.** Rejected because GitHub-hosted runner
   addresses change and opening port 22 broadly weakens the host boundary.
5. **Self-hosted GitHub runner on the production EC2.** Rejected because
   repository workflow code would execute directly inside the production
   failure boundary.
6. **Run migrations automatically at API startup.** Rejected because multiple
   starts/restarts make migration ownership and rollback ambiguous.
7. **Use mutable `latest` for deployment.** Rejected because it cannot prove
   which commit is running or support deterministic rollback.

## Risks and Required Proof

| Risk | Cause and effect | Required proof |
| --- | --- | --- |
| Token invalidation after deploy | startup-generated RSA key changes | login, deploy/restart, refresh and authenticated request still succeed |
| Cross-origin auth failure | Vercel and API are different origins | exact CORS origin, credentials, Secure cookie and refresh smoke |
| MinIO URLs are unreachable | signatures use an internal endpoint | real browser PUT/GET through `assets.<domain>` |
| Data loss | one EC2/EBS is one failure boundary | off-host backup plus timed restore drill |
| Broken migration rollback | schema is ahead of old image | compatibility classification and restore gate per migration |
| CI proves different artifact | server builds source again | image digest/SHA built once and deployed unchanged |
| Competing deployments | two main pushes overlap | workflow concurrency and host lock proof |
| Secret leakage | values enter GitHub/SSM logs | secret scan and redacted failure-path review |
| False readiness | container runs before dependencies work | dependency-aware `/health/ready` and negative readiness tests |
| Whole-site outage | all backend services share EC2 | documented single-host limitation, monitoring and recovery runbook |

## Product and Decision Documentation

Before release:

- create `docs/product/deployment.md` as the current production contract;
- update `docs/ARCHITECTURE.md` to describe Vercel plus the single-EC2 runtime;
- add an architecture decision for the single-EC2/Vercel/GHCR/SSM topology;
- update authentication and object-storage product docs for production origin,
  cookie, signing-key, public endpoint, and backup rules;
- add release, backup, restore, and rollback runbooks.
