# FluentA Production Operations

This directory owns the single-EC2 production runtime. The frontend-bearing
Caddy image serves `sophion.io.vn`, proxies `api.sophion.io.vn` to the private
API container, and is released together with the API and migration images.

## Host Layout

```text
/opt/fluenta/current                   active deployment files
/opt/fluenta/shared/production.env     root-readable production configuration
/opt/fluenta/backups                   owner-only temporary backup workspace
/opt/fluenta/bin                       installed operational scripts
/opt/fluenta/shared/releases           owner-only release state and prior refs
/opt/fluenta/shared/deployment-backups owner-only deployment artifact backups
```

The real environment file is never copied into the repository, images, command
arguments, or logs.

Initialize it once from the installed template:

```bash
sudo /opt/fluenta/bin/initialize-production-env.sh
```

The initializer refuses to overwrite an existing file and writes a random
PostgreSQL password, JWT key, and OTP hash key directly to the owner-only file
without printing them. An operator must then edit the remaining provider and
immutable-image placeholders directly on the host.

## PostgreSQL Backup

`bin/backup-postgres.sh`:

1. runs a custom-format compressed `pg_dump` inside the production PostgreSQL
   container;
2. validates the archive with `pg_restore --list`;
3. creates a SHA-256 sidecar;
4. uploads both files with SSE-S3 to
   `s3://fluenta-prod-db-backups-sophion-io-vn/postgres/daily/`;
5. checks the remote content length; and
6. deletes the owner-only local workspace on exit.

The bucket lifecycle expires current objects after 14 days. The EC2 role may
PUT/GET this prefix but cannot delete backup objects or mutate bucket policy,
lifecycle, Versioning, ACLs, or Public Access Block.

Run manually after the host layout and AWS CLI are installed:

```bash
sudo /opt/fluenta/bin/backup-postgres.sh
```

After the first manual backup and isolated restore both pass, install and
enable `systemd/fluenta-postgres-backup.service` and its timer. The timer runs
daily at 18:30 UTC (01:30 Asia/Saigon), adds up to 15 minutes of jitter, and
uses `Persistent=true` so a missed run is started after the host comes back.
Check it without exposing configuration values:

```bash
systemctl list-timers fluenta-postgres-backup.timer
sudo systemctl status fluenta-postgres-backup.service --no-pager
```

## Isolated Restore Drill

List the approved prefix and select an exact dump key:

```bash
aws s3api list-objects-v2 \
  --bucket fluenta-prod-db-backups-sophion-io-vn \
  --prefix postgres/daily/ \
  --query 'Contents[?ends_with(Key, `.dump`)].Key' \
  --output text
```

Then run:

```bash
sudo /opt/fluenta/bin/restore-postgres-drill.sh \
  postgres/daily/postgres-YYYYMMDDTHHMMSSZ.dump
```

The script accepts only the fixed daily key shape, verifies the checksum,
creates a randomly suffixed isolated database, restores the dump, requires at
least one public table, and drops the isolated database during cleanup. It has
no option that can name or replace the production database.

## Immutable Production Release

`bin/deploy-release.sh` accepts exactly one lowercase 40-character Git commit
SHA. It is installed as `/opt/fluenta/bin/deploy-release.sh`, owned by
`root:root`, and executable only as an operator/root-controlled artifact.

The release sequence is fixed:

1. acquire `/run/lock/fluenta-deploy.lock` without waiting;
2. verify the owner-only production environment, Compose, Caddyfile, and
   current public API readiness;
3. resolve the SHA tag in the exact API, migration, and frontend ECR
   repositories to digests;
4. authenticate through the EC2 instance role, pull all three immutable
   digest references, and validate the mounted Caddyfile with the candidate
   frontend image before database mutation;
5. create the off-host PostgreSQL backup and replace only `API_IMAGE`,
   `MIGRATIONS_IMAGE`, and `FRONTEND_IMAGE` in `production.env`;
6. run the one-shot migration, recreate the API and Caddy, then require API,
   frontend root, and frontend deep-link HTTPS readiness;
7. record the successful SHA and all three digests under
   `/opt/fluenta/shared/releases/current`.

Before migration starts, an error restores all prior image-reference lines.
After migration starts, automatic API-image or database rollback is
prohibited. If the API remains healthy but the frontend edge fails, the script
restores only the previous frontend reference and the pending pre-install
Compose/Caddy/release-script backup, then recreates Caddy. API and database
references remain untouched.

## Checksum-Verified Deployment Artifact Install

The SHA-only SSM command never transports Compose, Caddyfile, or shell scripts.
Before the first same-host frontend release, stage exactly these files from the
approved clean commit:

```text
compose.yml
Caddyfile
bin/deploy-release.sh
bin/install-deployment-artifacts.sh
SHA256SUMS
```

Create `SHA256SUMS` inside the staging directory on a trusted Linux/WSL
checkout:

```bash
sha256sum \
  Caddyfile \
  compose.yml \
  bin/deploy-release.sh \
  bin/install-deployment-artifacts.sh \
  > SHA256SUMS

manifest_sha="$(sha256sum SHA256SUMS | awk '{print $1}')"
printf '%s\n' "$manifest_sha"
```

Keep the printed manifest digest in the trusted terminal; do not copy it from
the uploaded EC2 directory.

The real environment must already contain one immutable initial edge reference
so the new Compose contract can be validated. For the one-time migration from
the existing official Caddy runtime, use the exact currently running digest:

```dotenv
FRONTEND_IMAGE=caddy:2.11.4-alpine@sha256:5f5c8640aae01df9654968d946d8f1a56c497f1dd5c5cda4cf95ab7c14d58648
```

After uploading the staging directory to an owner-controlled temporary path on
EC2, transfer ownership before running any staged script, then pass the trusted
manifest digest as the second argument:

```bash
sudo chown -R root:root /path/to/staged
sudo chmod -R go-w /path/to/staged
cd /path/to/staged
printf '%s  SHA256SUMS\n' '<trusted-64-character-manifest-sha256>' | \
  sudo sha256sum --check --strict -
sudo bash /path/to/staged/bin/install-deployment-artifacts.sh \
  /path/to/staged \
  '<trusted-64-character-manifest-sha256>'
```

The installer verifies the exact four-entry manifest, validates Compose and
Caddy before mutation, backs up the active artifacts, installs root-owned
copies, and writes an owner-only rollback marker. It does not restart a
container. A successful production release clears the marker; an edge-only
failure consumes it to restore the previous artifacts.

Do not run a release until all three private ECR repositories, the exact EC2
pull policy, the updated fixed SSM document, and the GitHub production variable
`VITE_GOOGLE_CLIENT_ID` are present.

## GitHub OIDC And AWS Artifacts

`deploy/production/aws` contains exact-account templates for:

- the GitHub OIDC role trust policy;
- the GitHub ECR-push and fixed-SSM permission policy;
- the EC2 ECR-pull policy;
- the private ECR lifecycle policy, applied independently to all three
  repositories; and
- the `FluentA-DeployBackendRelease` SSM document.

The SSM document exposes only `CommitSha`, validates it against
`^[0-9a-f]{40}$`, and invokes the root-owned release script. The GitHub role is
not allowed to use the generic `AWS-RunShellScript` document.

The GitHub `production` environment must allow deployment only from `main`.
No AWS access key or application secret is configured in GitHub; the CD job
uses `id-token: write` only to assume
`FluentAGitHubProductionDeployRole` through OIDC.
