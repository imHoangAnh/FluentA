#!/usr/bin/env bash
set -Eeuo pipefail

umask 077

readonly deploy_dir="${FLUENTA_DEPLOY_DIR:-/opt/fluenta/current}"
readonly env_file="${FLUENTA_ENV_FILE:-/opt/fluenta/shared/production.env}"
readonly backup_dir="${FLUENTA_BACKUP_DIR:-/opt/fluenta/backups}"
readonly backup_bucket="${FLUENTA_BACKUP_BUCKET:-fluenta-prod-db-backups-sophion-io-vn}"
readonly compose_file="${deploy_dir}/compose.yml"

usage() {
  printf 'Usage: %s postgres/daily/postgres-YYYYMMDDTHHMMSSZ.dump\n' "$0" >&2
  exit 2
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || {
    printf 'Required command is unavailable: %s\n' "$1" >&2
    exit 1
  }
}

[[ $# -eq 1 ]] || usage
readonly remote_key="$1"

[[ "$remote_key" =~ ^postgres/daily/postgres-[0-9]{8}T[0-9]{6}Z\.dump$ ]] || {
  printf 'Backup key is outside the approved daily PostgreSQL prefix or format.\n' >&2
  exit 2
}

require_command aws
require_command docker
require_command sha256sum

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

work_dir="$(mktemp -d "${backup_dir}/.restore-drill.XXXXXX")"
backup_name="${remote_key##*/}"
dump_path="${work_dir}/${backup_name}"
checksum_path="${dump_path}.sha256"
restore_database="fluenta_restore_$(date -u +'%Y%m%dT%H%M%SZ')_${RANDOM}"
database_created=0

cleanup() {
  if [[ "$database_created" -eq 1 ]]; then
    (
      cd -- "$deploy_dir"
      docker compose \
        --env-file "$env_file" \
        --file "$compose_file" \
        exec -T postgres \
        sh -euc 'exec dropdb --if-exists --force --username "$POSTGRES_USER" "$1"' \
        restore-cleanup "$restore_database"
    ) >/dev/null 2>&1 || true
  fi

  rm -rf -- "$work_dir"
}
trap cleanup EXIT

aws s3 cp \
  "s3://${backup_bucket}/${remote_key}" \
  "$dump_path" \
  --only-show-errors

aws s3 cp \
  "s3://${backup_bucket}/${remote_key}.sha256" \
  "$checksum_path" \
  --only-show-errors

(
  cd -- "$work_dir"
  sha256sum --check "${backup_name}.sha256" >/dev/null
)

(
  cd -- "$deploy_dir"
  docker compose \
    --env-file "$env_file" \
    --file "$compose_file" \
    exec -T postgres \
    sh -euc 'exec createdb --username "$POSTGRES_USER" "$1"' \
    restore-create "$restore_database"
)
database_created=1

(
  cd -- "$deploy_dir"
  docker compose \
    --env-file "$env_file" \
    --file "$compose_file" \
    exec -T postgres \
    sh -euc 'exec pg_restore --exit-on-error --no-owner --no-privileges --username "$POSTGRES_USER" --dbname "$1"' \
    restore-load "$restore_database"
) <"$dump_path"

table_count="$(
  (
    cd -- "$deploy_dir"
    docker compose \
      --env-file "$env_file" \
      --file "$compose_file" \
      exec -T postgres \
      sh -euc 'exec psql --no-align --tuples-only --username "$POSTGRES_USER" --dbname "$1" --command "SELECT count(*) FROM information_schema.tables WHERE table_schema = '\''public'\'';"' \
      restore-verify "$restore_database"
  ) | tr -d '[:space:]'
)"

[[ "$table_count" =~ ^[1-9][0-9]*$ ]] || {
  printf 'Restore drill produced no public tables.\n' >&2
  exit 1
}

printf 'PostgreSQL isolated restore drill passed: %s public tables restored.\n' \
  "$table_count"
