#!/usr/bin/env bash
set -Eeuo pipefail

umask 077

readonly deploy_dir="${FLUENTA_DEPLOY_DIR:-/opt/fluenta/current}"
readonly env_file="${FLUENTA_ENV_FILE:-/opt/fluenta/shared/production.env}"
readonly backup_dir="${FLUENTA_BACKUP_DIR:-/opt/fluenta/backups}"
readonly backup_bucket="${FLUENTA_BACKUP_BUCKET:-fluenta-prod-db-backups-sophion-io-vn}"
readonly backup_prefix="${FLUENTA_BACKUP_PREFIX:-postgres/daily}"
readonly compose_file="${deploy_dir}/compose.yml"

require_command() {
  command -v "$1" >/dev/null 2>&1 || {
    printf 'Required command is unavailable: %s\n' "$1" >&2
    exit 1
  }
}

require_command aws
require_command docker
require_command sha256sum
require_command stat

[[ -f "$compose_file" ]] || {
  printf 'Production Compose file is unavailable: %s\n' "$compose_file" >&2
  exit 1
}

[[ -f "$env_file" ]] || {
  printf 'Production environment file is unavailable: %s\n' "$env_file" >&2
  exit 1
}

mkdir -p -- "$backup_dir"
chmod 700 -- "$backup_dir"

timestamp="$(date -u +'%Y%m%dT%H%M%SZ')"
backup_name="postgres-${timestamp}.dump"
remote_key="${backup_prefix}/${backup_name}"
work_dir="$(mktemp -d "${backup_dir}/.backup.XXXXXX")"
dump_path="${work_dir}/${backup_name}"
checksum_path="${dump_path}.sha256"

cleanup() {
  rm -rf -- "$work_dir"
}
trap cleanup EXIT

(
  cd -- "$deploy_dir"
  docker compose \
    --env-file "$env_file" \
    --file "$compose_file" \
    exec -T postgres \
    sh -euc 'exec pg_dump --format=custom --compress=gzip:6 --no-owner --no-privileges --username "$POSTGRES_USER" --dbname "$POSTGRES_DB"'
) >"$dump_path"

[[ -s "$dump_path" ]] || {
  printf 'PostgreSQL produced an empty backup.\n' >&2
  exit 1
}

(
  cd -- "$deploy_dir"
  docker compose \
    --env-file "$env_file" \
    --file "$compose_file" \
    exec -T postgres pg_restore --list
) <"$dump_path" >/dev/null

(
  cd -- "$work_dir"
  sha256sum "$backup_name" >"${backup_name}.sha256"
)

aws s3 cp \
  "$dump_path" \
  "s3://${backup_bucket}/${remote_key}" \
  --sse AES256 \
  --only-show-errors

aws s3 cp \
  "$checksum_path" \
  "s3://${backup_bucket}/${remote_key}.sha256" \
  --sse AES256 \
  --only-show-errors

local_size="$(stat --format='%s' "$dump_path")"
remote_size="$(aws s3api head-object \
  --bucket "$backup_bucket" \
  --key "$remote_key" \
  --query ContentLength \
  --output text)"

[[ "$remote_size" == "$local_size" ]] || {
  printf 'Uploaded backup size does not match the local backup.\n' >&2
  exit 1
}

printf 'PostgreSQL backup uploaded and verified: s3://%s/%s\n' \
  "$backup_bucket" "$remote_key"

