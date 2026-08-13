# FluentA Local Docker Runtime

This stack runs FluentA locally without AWS services. It builds the React SPA,
ASP.NET Core API/Hangfire runtime, and EF migration bundle from the current
checkout, then starts them with a new PostgreSQL database and private MinIO
bucket. Resend remains the email provider for OTP and password-reset messages.
Azure Speech remains enabled for pronunciation assessment, and Google Identity
Services remains enabled for Google login.

## Start

Requirements: Docker Desktop, a Resend API key with a verified sender, and an
Azure Speech region plus subscription key. Google login additionally requires
a Google Identity Services Web application client ID.

From the repository root:

```powershell
.\deploy\local\start.ps1 -Detach
```

On the first run, the script asks for the Google web client ID, Resend API key
and sender, and Azure Speech region and subscription key. It generates
independent local PostgreSQL, MinIO, JWT, and OTP secrets and writes all values
to the ignored `deploy/local/.env` file. When upgrading an existing local stack,
the script asks for and appends `GOOGLE_CLIENT_ID` if that value is missing.

In Google Cloud Console, configure the Web client with this Authorized
JavaScript origin (no path or trailing slash):

```text
https://localhost:7443
```

This login flow uses a public client ID and Google Identity Services ID token;
it does not require a Google client secret or redirect URI. Resend and Azure
credentials are passed to containers only at runtime and are not Docker build
arguments or image layers. The public Google client ID is embedded into the
compiled frontend and the same value is supplied to the API as token audience.

Open:

- FluentA: `https://localhost:7443`
- MinIO console: `http://localhost:59001`
- PostgreSQL host port for local tools: `localhost:55432`

Caddy creates a local TLS certificate. The browser may show a certificate
warning the first time; continue only for `localhost`.

MinIO API port `59000` is published on the host because the API container and
the host browser must use the same authority in presigned upload/download
URLs. The bucket is private and anonymous access is denied, but do not forward
this port through a router or allow it through an untrusted network firewall.

## Direct Compose Command

To manage `.env` manually:

```powershell
Copy-Item deploy/local/env.example deploy/local/.env
# Fill every blank value in deploy/local/.env.
docker compose --env-file deploy/local/.env -f deploy/local/compose.yml up --build -d
```

## Status And Logs

```powershell
docker compose --env-file deploy/local/.env -f deploy/local/compose.yml ps
docker compose --env-file deploy/local/.env -f deploy/local/compose.yml logs -f api web
```

The one-shot `migrations` and `minio-bootstrap` services should show exit code
`0`. The long-running `postgres`, `minio`, `api`, and `web` services should be
healthy.

## Stop Or Reset

Stop containers while retaining the new local database and MinIO objects:

```powershell
docker compose --env-file deploy/local/.env -f deploy/local/compose.yml down
```

Explicitly remove only this local stack's database, MinIO objects, and local
Caddy CA/state:

```powershell
docker compose --env-file deploy/local/.env -f deploy/local/compose.yml down --volumes
```

Deleting `deploy/local/.env` removes the generated local secrets. Existing
`docker-compose.dev.yml` containers and volumes are separate and untouched.
