# FluentA Production Operations

This directory owns the single-EC2 backend runtime. Frontend production is
deployed separately by Vercel.

## Host Layout

```text
/opt/fluenta/current                   active deployment files
/opt/fluenta/shared/production.env     root-readable production configuration
/opt/fluenta/backups                   owner-only temporary backup workspace
/opt/fluenta/bin                       installed operational scripts
/opt/fluenta/shared/releases           owner-only release state and prior refs
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

## Immutable Backend Release

`bin/deploy-release.sh` accepts exactly one lowercase 40-character Git commit
SHA. It is installed as `/opt/fluenta/bin/deploy-release.sh`, owned by
`root:root`, and executable only as an operator/root-controlled artifact.

The release sequence is fixed:

1. acquire `/run/lock/fluenta-deploy.lock` without waiting;
2. verify the owner-only production environment and current public readiness;
3. resolve the SHA tag in both exact private ECR repositories to digests;
4. authenticate through the EC2 instance role, create the off-host PostgreSQL
   backup, and pull both immutable digest references;
5. replace only `API_IMAGE` and `MIGRATIONS_IMAGE` in `production.env`;
6. run the one-shot migration, recreate the API, and require container plus
   public HTTPS readiness;
7. record the successful SHA and digests under
   `/opt/fluenta/shared/releases/current`.

Before migration starts, an error restores the prior image-reference lines.
After migration starts, automatic image or database rollback is prohibited;
the script retains the off-host backup and stops for human recovery.

Install or update the repository-owned release artifact on EC2:

```bash
sudo install -o root -g root -m 755 \
  deploy/production/bin/deploy-release.sh \
  /opt/fluenta/bin/deploy-release.sh
```

Do not run a release manually until both private ECR repositories, the EC2 pull
policy, and the custom SSM document are present.

## GitHub OIDC And AWS Artifacts

`deploy/production/aws` contains exact-account templates for:

- the GitHub OIDC role trust policy;
- the GitHub ECR-push and fixed-SSM permission policy;
- the EC2 ECR-pull policy;
- the private ECR lifecycle policy; and
- the `FluentA-DeployBackendRelease` SSM document.

The SSM document exposes only `CommitSha`, validates it against
`^[0-9a-f]{40}$`, and invokes the root-owned release script. The GitHub role is
not allowed to use the generic `AWS-RunShellScript` document.

The GitHub `production` environment must allow deployment only from `main`.
No AWS access key or application secret is configured in GitHub; the CD job
uses `id-token: write` only to assume
`FluentAGitHubProductionDeployRole` through OIDC.
